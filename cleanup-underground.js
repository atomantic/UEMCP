#!/usr/bin/env node
import { PythonBridge } from './server/dist/services/python-bridge.js';

async function cleanupUnderground() {
  console.log('Cleaning up underground actors...\n');
  
  const bridge = new PythonBridge();
  
  try {
    const result = await bridge.executeCommand({
      type: 'python.execute',
      params: {
        code: `
# Find and delete all actors that are underground (z < -100)
actors = unreal.EditorLevelLibrary.get_all_level_actors()
underground_actors = []
deleted = []

for actor in actors:
    location = actor.get_actor_location()
    if location.z < -100:  # Below ground threshold
        actor_name = actor.get_actor_label()
        underground_actors.append(actor_name)
        # Delete the actor
        unreal.EditorLevelLibrary.destroy_actor(actor)
        deleted.append(actor_name)

result = {
    'found': len(underground_actors),
    'deleted': deleted,
    'message': f'Deleted {len(deleted)} underground actors'
}
`
      }
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the cleanup
cleanupUnderground().catch(console.error);