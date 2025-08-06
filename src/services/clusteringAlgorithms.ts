import { getRepositoryFactory } from '../db/index.js';
import { VectorEmbeddingRepository } from '../db/repositories/index.js';

// Types for clustering
export interface VectorPoint {
  id: string;
  vector: number[];
  metadata: {
    serverName: string;
    toolName: string;
    description: string;
    inputSchema?: any;
  };
}

export interface ClusterCenter {
  id: number;
  vector: number[];
  points: VectorPoint[];
}

export interface ClusteringResult {
  clusters: ClusterCenter[];
  labels: number[]; // cluster assignment for each point
  inertia: number; // within-cluster sum of squared distances
  iterations: number;
}

/**
 * Vector-based clustering algorithms for tool grouping
 */
export class VectorClusterer {
  /**
   * K-means clustering algorithm for grouping tools by vector similarity
   */
  static async kMeansClustering(
    points: VectorPoint[],
    k: number,
    maxIterations: number = 100,
    tolerance: number = 1e-4
  ): Promise<ClusteringResult> {
    if (points.length === 0) {
      return {
        clusters: [],
        labels: [],
        inertia: 0,
        iterations: 0
      };
    }

    if (k <= 0 || k > points.length) {
      k = Math.min(Math.max(1, Math.floor(Math.sqrt(points.length / 2))), points.length);
    }

    const dimensions = points[0].vector.length;
    
    // Initialize centroids randomly
    let centroids = this.initializeRandomCentroids(points, k, dimensions);
    let labels = new Array(points.length).fill(0);
    let prevInertia = Infinity;
    let iterations = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1;
      
      // Assign points to nearest centroid
      const newLabels = points.map((point) => {
        let minDistance = Infinity;
        let bestCluster = 0;
        
        centroids.forEach((centroid, centroidIdx) => {
          const distance = this.euclideanDistance(point.vector, centroid.vector);
          if (distance < minDistance) {
            minDistance = distance;
            bestCluster = centroidIdx;
          }
        });
        
        return bestCluster;
      });
      
      // Update centroids
      const newCentroids = this.updateCentroids(points, newLabels, k, dimensions);
      
      // Calculate inertia (within-cluster sum of squared distances)
      const inertia = this.calculateInertia(points, newLabels, newCentroids);
      
      // Check for convergence
      if (Math.abs(prevInertia - inertia) < tolerance) {
        labels = newLabels;
        centroids = newCentroids;
        break;
      }
      
      labels = newLabels;
      centroids = newCentroids;
      prevInertia = inertia;
    }

    // Build final clusters
    const clusters: ClusterCenter[] = centroids.map((centroid, idx) => ({
      id: idx,
      vector: centroid.vector,
      points: points.filter((_, pointIdx) => labels[pointIdx] === idx)
    }));

    return {
      clusters: clusters.filter(cluster => cluster.points.length > 0),
      labels,
      inertia: prevInertia,
      iterations
    };
  }

  /**
   * Hierarchical clustering using agglomerative approach
   */
  static async hierarchicalClustering(
    points: VectorPoint[],
    maxClusters: number = 8,
    linkage: 'single' | 'complete' | 'average' = 'average'
  ): Promise<ClusteringResult> {
    if (points.length === 0) {
      return {
        clusters: [],
        labels: [],
        inertia: 0,
        iterations: 0
      };
    }

    // Start with each point as its own cluster
    let clusters = points.map((point, idx) => ({
      id: idx,
      points: [point],
      centroid: [...point.vector]
    }));

    const mergeHistory: { distance: number; merged: number[] }[] = [];
    
    // Merge clusters until we reach the desired number
    while (clusters.length > maxClusters && clusters.length > 1) {
      // Find the two closest clusters
      let minDistance = Infinity;
      let mergeIndices = [-1, -1];
      
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const distance = this.calculateClusterDistance(
            clusters[i],
            clusters[j],
            linkage
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            mergeIndices = [i, j];
          }
        }
      }
      
      if (mergeIndices[0] === -1) break;
      
      // Merge the two closest clusters
      const [i, j] = mergeIndices;
      const newCluster = {
        id: Math.max(clusters[i].id, clusters[j].id) + 1,
        points: [...clusters[i].points, ...clusters[j].points],
        centroid: this.calculateCentroid([...clusters[i].points, ...clusters[j].points])
      };
      
      mergeHistory.push({
        distance: minDistance,
        merged: [clusters[i].id, clusters[j].id]
      });
      
      // Remove old clusters and add new one
      clusters = [
        ...clusters.slice(0, Math.min(i, j)),
        ...clusters.slice(Math.min(i, j) + 1, Math.max(i, j)),
        ...clusters.slice(Math.max(i, j) + 1),
        newCluster
      ];
    }

    // Generate labels and final cluster format
    const labels = new Array(points.length);
    const finalClusters: ClusterCenter[] = clusters.map((cluster, idx) => {
      cluster.points.forEach((point) => {
        const originalIdx = points.findIndex(p => p.id === point.id);
        if (originalIdx !== -1) {
          labels[originalIdx] = idx;
        }
      });
      
      return {
        id: idx,
        vector: cluster.centroid,
        points: cluster.points
      };
    });

    // Calculate final inertia
    const inertia = finalClusters.reduce((sum, cluster) => {
      return sum + cluster.points.reduce((clusterSum, point) => {
        return clusterSum + Math.pow(this.euclideanDistance(point.vector, cluster.vector), 2);
      }, 0);
    }, 0);

    return {
      clusters: finalClusters,
      labels,
      inertia,
      iterations: mergeHistory.length
    };
  }

  /**
   * Automatically determine optimal number of clusters using elbow method
   */
  static async findOptimalClusters(
    points: VectorPoint[],
    maxK: number = 10
  ): Promise<{ optimalK: number; scores: number[] }> {
    if (points.length < 2) {
      return { optimalK: 1, scores: [0] };
    }

    const maxClusters = Math.min(maxK, Math.floor(points.length / 2));
    const scores: number[] = [];
    
    for (let k = 1; k <= maxClusters; k++) {
      const result = await this.kMeansClustering(points, k, 50);
      scores.push(result.inertia);
    }
    
    // Find elbow using rate of change
    let optimalK = 1;
    let maxImprovement = 0;
    
    for (let i = 1; i < scores.length - 1; i++) {
      const improvement = scores[i - 1] - scores[i];
      const nextImprovement = scores[i] - scores[i + 1];
      const changeInImprovement = improvement - nextImprovement;
      
      if (changeInImprovement > maxImprovement) {
        maxImprovement = changeInImprovement;
        optimalK = i + 1;
      }
    }
    
    return { optimalK, scores };
  }

  /**
   * Load tool vectors from database for clustering
   */
  static async loadToolVectors(): Promise<VectorPoint[]> {
    try {
      const vectorRepository = getRepositoryFactory('vectorEmbeddings')() as VectorEmbeddingRepository;
      
      // Get all tool embeddings
      const embeddings = await vectorRepository.searchSimilar(
        new Array(1536).fill(0), // Zero vector to get all results
        1000, // Large limit
        -1, // No threshold
        ['tool']
      );

      return embeddings.map((result, idx) => {
        let metadata = {
          serverName: 'unknown',
          toolName: 'unknown', 
          description: result.embedding.text_content || '',
          inputSchema: {}
        };

        // Parse metadata if available
        if (result.embedding.metadata && typeof result.embedding.metadata === 'string') {
          try {
            const parsed = JSON.parse(result.embedding.metadata);
            metadata = {
              serverName: parsed.serverName || 'unknown',
              toolName: parsed.toolName || 'unknown',
              description: parsed.description || result.embedding.text_content || '',
              inputSchema: parsed.inputSchema || {}
            };
          } catch (error) {
            console.warn('Failed to parse embedding metadata:', error);
          }
        }

        return {
          id: `${idx}_${metadata.serverName}_${metadata.toolName}`,
          vector: result.embedding.embedding,
          metadata
        };
      });
    } catch (error) {
      console.error('Error loading tool vectors:', error);
      return [];
    }
  }

  /**
   * Cluster tools and generate intelligent names for each cluster
   */
  static async clusterToolsWithSmartNaming(
    method: 'kmeans' | 'hierarchical' = 'kmeans',
    targetClusters?: number
  ): Promise<{
    clusters: Array<{
      id: number;
      name: string;
      description: string;
      tools: VectorPoint[];
      keywords: string[];
      confidence: number;
    }>;
    metadata: {
      algorithm: string;
      totalTools: number;
      iterations: number;
      inertia: number;
    };
  }> {
    const points = await this.loadToolVectors();
    
    if (points.length === 0) {
      return {
        clusters: [],
        metadata: { algorithm: method, totalTools: 0, iterations: 0, inertia: 0 }
      };
    }

    let clusteringResult: ClusteringResult;
    
    if (method === 'hierarchical') {
      const maxClusters = targetClusters || Math.min(8, Math.floor(points.length / 3));
      clusteringResult = await this.hierarchicalClustering(points, maxClusters);
    } else {
      let k = targetClusters;
      if (!k) {
        const { optimalK } = await this.findOptimalClusters(points);
        k = optimalK;
      }
      clusteringResult = await this.kMeansClustering(points, k);
    }

    // Generate intelligent names and descriptions for each cluster
    const namedClusters = clusteringResult.clusters.map(cluster => {
      const clusterAnalysis = this.analyzeCluster(cluster.points);
      
      return {
        id: cluster.id,
        name: clusterAnalysis.name,
        description: clusterAnalysis.description,
        tools: cluster.points,
        keywords: clusterAnalysis.keywords,
        confidence: clusterAnalysis.confidence
      };
    });

    return {
      clusters: namedClusters.filter(cluster => cluster.tools.length > 0),
      metadata: {
        algorithm: method,
        totalTools: points.length,
        iterations: clusteringResult.iterations,
        inertia: clusteringResult.inertia
      }
    };
  }

  // Helper methods
  private static initializeRandomCentroids(
    points: VectorPoint[],
    k: number,
    _dimensions: number
  ): { id: number; vector: number[] }[] {
    // Use K-means++ initialization for better initial centroids
    const centroids: { id: number; vector: number[] }[] = [];
    
    // Choose first centroid randomly
    const firstIdx = Math.floor(Math.random() * points.length);
    centroids.push({
      id: 0,
      vector: [...points[firstIdx].vector]
    });
    
    // Choose remaining centroids based on distance from existing ones
    for (let i = 1; i < k; i++) {
      const distances = points.map(point => {
        let minDistance = Infinity;
        centroids.forEach(centroid => {
          const distance = this.euclideanDistance(point.vector, centroid.vector);
          minDistance = Math.min(minDistance, distance);
        });
        return minDistance * minDistance; // Squared distance for probability
      });
      
      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      const probabilities = distances.map(d => d / totalDistance);
      
      // Choose next centroid based on probability distribution
      let random = Math.random();
      let chosenIdx = 0;
      for (let j = 0; j < probabilities.length; j++) {
        random -= probabilities[j];
        if (random <= 0) {
          chosenIdx = j;
          break;
        }
      }
      
      centroids.push({
        id: i,
        vector: [...points[chosenIdx].vector]
      });
    }
    
    return centroids;
  }

  private static updateCentroids(
    points: VectorPoint[],
    labels: number[],
    k: number,
    dimensions: number
  ): { id: number; vector: number[] }[] {
    const centroids: { id: number; vector: number[] }[] = [];
    
    for (let i = 0; i < k; i++) {
      const clusterPoints = points.filter((_, idx) => labels[idx] === i);
      
      if (clusterPoints.length === 0) {
        // If no points assigned, keep the old centroid or create a new random one
        centroids.push({
          id: i,
          vector: new Array(dimensions).fill(0).map(() => Math.random())
        });
      } else {
        const centroid = this.calculateCentroid(clusterPoints);
        centroids.push({
          id: i,
          vector: centroid
        });
      }
    }
    
    return centroids;
  }

  private static calculateCentroid(points: VectorPoint[]): number[] {
    if (points.length === 0) return [];
    
    const dimensions = points[0].vector.length;
    const centroid = new Array(dimensions).fill(0);
    
    points.forEach(point => {
      point.vector.forEach((value, idx) => {
        centroid[idx] += value;
      });
    });
    
    return centroid.map(sum => sum / points.length);
  }

  private static calculateInertia(
    points: VectorPoint[],
    labels: number[],
    centroids: { id: number; vector: number[] }[]
  ): number {
    let inertia = 0;
    
    points.forEach((point, idx) => {
      const centroid = centroids[labels[idx]];
      if (centroid) {
        inertia += Math.pow(this.euclideanDistance(point.vector, centroid.vector), 2);
      }
    });
    
    return inertia;
  }

  private static euclideanDistance(vector1: number[], vector2: number[]): number {
    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      sum += Math.pow(vector1[i] - vector2[i], 2);
    }
    return Math.sqrt(sum);
  }

  private static calculateClusterDistance(
    cluster1: { points: VectorPoint[]; centroid: number[] },
    cluster2: { points: VectorPoint[]; centroid: number[] },
    linkage: 'single' | 'complete' | 'average'
  ): number {
    switch (linkage) {
      case 'single': {
        // Minimum distance between any two points
        let minDistance = Infinity;
        for (const p1 of cluster1.points) {
          for (const p2 of cluster2.points) {
            const distance = this.euclideanDistance(p1.vector, p2.vector);
            minDistance = Math.min(minDistance, distance);
          }
        }
        return minDistance;
      }
        
      case 'complete': {
        // Maximum distance between any two points
        let maxDistance = 0;
        for (const p1 of cluster1.points) {
          for (const p2 of cluster2.points) {
            const distance = this.euclideanDistance(p1.vector, p2.vector);
            maxDistance = Math.max(maxDistance, distance);
          }
        }
        return maxDistance;
      }
        
      case 'average':
      default:
        // Distance between centroids (average linkage approximation)
        return this.euclideanDistance(cluster1.centroid, cluster2.centroid);
    }
  }

  private static analyzeCluster(tools: VectorPoint[]): {
    name: string;
    description: string;
    keywords: string[];
    confidence: number;
  } {
    if (tools.length === 0) {
      return {
        name: 'Empty Cluster',
        description: 'No tools in this cluster',
        keywords: [],
        confidence: 0
      };
    }

    // Extract all text for analysis
    const allText = tools
      .map(t => `${t.metadata.toolName} ${t.metadata.description}`)
      .join(' ')
      .toLowerCase();

    // Extract keywords by frequency
    const words = allText
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'with', 'tool', 'api', 'get', 'set'].includes(word));

    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    const keywords = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    // Generate name based on common patterns
    const servers = [...new Set(tools.map(t => t.metadata.serverName))];
    let name: string;
    let confidence: number;

    if (servers.length === 1) {
      // Single server cluster
      name = `${servers[0].charAt(0).toUpperCase() + servers[0].slice(1)} Tools`;
      confidence = 0.9;
    } else if (keywords.length > 0) {
      // Multi-server cluster based on functionality
      const primaryKeyword = keywords[0];
      name = `${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Tools`;
      confidence = Math.min(0.8, keywords.length / 3);
    } else {
      // Generic cluster
      name = `Mixed Tools (${servers.length} servers)`;
      confidence = 0.5;
    }

    const description = `Tools from ${servers.length} server(s): ${servers.slice(0, 3).join(', ')}${servers.length > 3 ? '...' : ''}. Primary functions: ${keywords.slice(0, 3).join(', ')}.`;

    return {
      name,
      description,
      keywords,
      confidence
    };
  }
}