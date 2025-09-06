#!/usr/bin/env node
import { PythonBridge } from '../../server/dist/services/python-bridge.js';

async function testPythonProxy() {
  console.log('Testing Python Proxy functionality...\n');
  
  const bridge = new PythonBridge();
  
  // Test 1: Simple expression
  console.log('Test 1: Simple expression');
  try {
    const result1 = await bridge.executeCommand({
      type: 'python.execute',
      params: {
        code: '2 + 2'
      }
    });
    console.log('Result:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 2: Using Unreal API
  console.log('Test 2: Get all actors');
  try {
    const result2 = await bridge.executeCommand({
      type: 'python.execute',
      params: {
        code: `
# Get all actors in the level
actors = unreal.EditorLevelLibrary.get_all_level_actors()
result = [actor.get_actor_label() for actor in actors[:5]]
`
      }
    });
    console.log('Result:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 3: Complex operation with context
  console.log('Test 3: Find actors near position');
  try {
    const result3 = await bridge.executeCommand({
      type: 'python.execute',
      params: {
        code: `
# Find actors near a position
position = unreal.Vector(x, y, z)
actors = unreal.EditorLevelLibrary.get_all_level_actors()
nearby = []
for actor in actors:
    distance = (actor.get_actor_location() - position).length()
    if distance < radius:
        nearby.append({
            'name': actor.get_actor_label(),
            'distance': distance
        })
result = nearby[:5]  # First 5
`,
        context: { x: 0, y: 0, z: 0, radius: 1000 }
      }
    });
    console.log('Result:', JSON.stringify(result3, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 4: Using UE API not in our facade - EditorUtilityLibrary
  console.log('Test 4: Using EditorUtilityLibrary (not in facade)');
  try {
    const result4 = await bridge.executeCommand({
      type: 'python.execute',
      params: {
        code: `
# Get selected actors - this API is not in our facade
selected = unreal.EditorUtilityLibrary.get_selected_assets()
result = {
    'selected_count': len(selected),
    'selected_assets': [str(asset) for asset in selected]
}
`
      }
    });
    console.log('Result:', JSON.stringify(result4, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 5: Find underground actors
  console.log('Test 5: Find underground actors (cleanup task)');
  try {
    const result5 = await bridge.executeCommand({
      type: 'python.execute',
      params: {
        code: `
# Find all actors that are underground (z < -100)
actors = unreal.EditorLevelLibrary.get_all_level_actors()
underground_actors = []

for actor in actors:
    location = actor.get_actor_location()
    if location.z < -100:  # Below ground threshold
        underground_actors.append({
            'name': actor.get_actor_label(),
            'class': actor.get_class().get_name(),
            'location': {'x': location.x, 'y': location.y, 'z': location.z}
        })

result = {
    'underground_count': len(underground_actors),
    'actors': underground_actors[:10]  # First 10 for visibility
}
`
      }
    });
    console.log('Result:', JSON.stringify(result5, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 6: Error handling
  console.log('Test 6: Error handling');
  try {
    const result6 = await bridge.executeCommand({
      type: 'python.execute',
      params: {
        code: `
# This should cause an error
1 / 0
`
      }
    });
    console.log('Result:', JSON.stringify(result6, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
testPythonProxy().catch(console.error);