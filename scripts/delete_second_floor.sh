#!/bin/bash
# Delete all second floor assets using curl

BASE_URL="http://localhost:8765"

echo "Finding and deleting all second floor assets..."

# Find all second floor actors
echo "Finding second floor actors..."
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "python.execute",
    "params": {
      "code": "import unreal\n\n# Get all actors in the level\nall_actors = unreal.EditorLevelLibrary.get_all_level_actors()\n\n# Find actors that might be second floor related\nsecond_floor_actors = []\n\nfor actor in all_actors:\n    actor_name = actor.get_actor_label()\n    \n    # Check if actor has \"F2\" in the name\n    if \"F2\" in actor_name:\n        second_floor_actors.append((actor_name, actor))\n        continue\n    \n    # Check folder path for \"SecondFloor\"\n    folder_path = actor.get_folder_path()\n    if \"SecondFloor\" in folder_path:\n        second_floor_actors.append((actor_name, actor))\n\n# Print results\nprint(f\"Found {len(second_floor_actors)} second floor actors to delete:\")\nfor actor_name, _ in sorted(second_floor_actors):\n    print(f\"  - {actor_name}\")\n\n# Return the count\nlen(second_floor_actors)"
    }
  }'

echo -e "\n\nDeleting second floor actors..."
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "python.execute",
    "params": {
      "code": "import unreal\n\n# Get all actors in the level\nall_actors = unreal.EditorLevelLibrary.get_all_level_actors()\n\n# Find and delete second floor actors\ndeleted_count = 0\ndeleted_names = []\n\nfor actor in all_actors:\n    actor_name = actor.get_actor_label()\n    folder_path = actor.get_folder_path()\n    \n    # Check if this is a second floor actor\n    should_delete = False\n    \n    if \"F2\" in actor_name:\n        should_delete = True\n    elif \"SecondFloor\" in folder_path:\n        should_delete = True\n    \n    if should_delete:\n        try:\n            # Delete the actor\n            unreal.EditorLevelLibrary.destroy_actor(actor)\n            deleted_count += 1\n            deleted_names.append(actor_name)\n            print(f\"  Deleted: {actor_name}\")\n        except Exception as e:\n            print(f\"  Failed to delete {actor_name}: {e}\")\n\nprint(f\"\\nDeleted {deleted_count} actors total\")\n\n# Return the count\ndeleted_count"
    }
  }'

echo -e "\n\nTaking verification screenshot..."
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "viewport.camera",
    "params": {
      "location": [9500, 1500, 600],
      "rotation": [-20, -45, 0]
    }
  }'

curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "viewport.screenshot",
    "params": {
      "filename": "house_after_second_floor_deletion.png"
    }
  }'

echo -e "\n\nSaving level..."
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "level.save",
    "params": {}
  }'

echo -e "\n\nSecond floor deletion complete!"