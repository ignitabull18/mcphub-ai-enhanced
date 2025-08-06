import { registerService, getService } from './registry.js';
import { DataService, DataServiceImpl } from './dataService.js';
import { memoryService } from './memoryService.js';
import { smartGroupAnalyzer } from './smartGroupAnalyzer.js';
import { ConversationalGroupService } from './conversationalGroupService.js';

registerService('dataService', {
  defaultImpl: DataServiceImpl,
});

// Register memory service as instance rather than class
registerService('memoryService', {
  defaultImpl: class { constructor() { return memoryService; } },
});

// Register smart group services as instances
registerService('smartGroupAnalyzer', {
  defaultImpl: class { constructor() { return smartGroupAnalyzer; } },
});

registerService('conversationalGroupService', {
  defaultImpl: ConversationalGroupService,
});

export function getDataService(): DataService {
  return getService<DataService>('dataService');
}

export function getMemoryService() {
  return getService('memoryService');
}

export function getSmartGroupAnalyzer() {
  return getService('smartGroupAnalyzer');
}

export function getConversationalGroupService() {
  return getService('conversationalGroupService');
}
