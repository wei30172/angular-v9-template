import { Injectable } from '@angular/core';
import Konva from 'konva';

@Injectable({
  providedIn: 'root',
})
export class KonvaEventService {
  // Map to track objects and their events
  private objectEventMap: Map<Konva.Node, Map<string, (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void>> = new Map();
  
  // Bind events to the object and track them
  bindObjectEvents(
    object: Konva.Node,
    events: { [key: string]: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void }
  ) {
    const eventMap = new Map<string, (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void>();
    Object.keys(events).forEach(eventType => {
      const handler = events[eventType];
      object.on(eventType, handler); // Bind the event to the object
      eventMap.set(eventType, handler); // Track the event
    });
    this.objectEventMap.set(object, eventMap); // Store the object and its event handlers in the map
  }

  // Remove all events from the object
  unbindObjectEvents(object: Konva.Node) {
    const eventMap = this.objectEventMap.get(object);
    if (eventMap) {
      eventMap.forEach((handler, eventType) => {
        object.off(eventType, handler); // Unbind the event from the object
      });
      this.objectEventMap.delete(object); // Remove the object from the map
    }
  }

  // Clear all events bound to objects on the stage
  clearAllObjectEvents() {
    this.objectEventMap.forEach((_, object) => {
      this.unbindObjectEvents(object); // Unbind all events for each object
    });
  }  
}