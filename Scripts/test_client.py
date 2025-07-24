import socket
import json
import argparse
import sys

def send_command(host, port, command_data):
    """Connects to the server, sends a command, and prints the response."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((host, port))
            
            # Serialize command data to JSON string and then to bytes
            message = json.dumps(command_data).encode('utf-8')
            print(f"Connecting to {host}:{port}...")
            s.sendall(message)
            print(f"Sent: {message.decode()}")

            # The current server implementation doesn't send a response yet,
            # so we won't wait for one. This will be added later.
            # response = s.recv(1024)
            # print(f"Received: {response.decode()}")

    except ConnectionRefusedError:
        print(f"Error: Connection refused. Make sure the UEMCP server is running in Unreal Engine on {host}:{port}.", file=sys.stderr)
    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)

def main():
    """Main function to parse arguments and send commands."""
    parser = argparse.ArgumentParser(description="Test client for UEMCP for Unreal Engine.")
    parser.add_argument('--host', default='127.0.0.1', help='The host IP of the UEMCP server.')
    parser.add_argument('--port', type=int, default=7000, help='The port of the UEMCP server.')
    parser.add_argument('command', nargs='?', default='spawn_actor', help='The command to send (e.g., spawn_actor).')
    parser.add_argument('params', nargs='*', help='Parameters for the command.')

    args = parser.parse_args()

    # For the MVP, we construct the spawn_actor command.
    # A more robust client would handle different commands.
    if args.command == 'spawn_actor':
        try:
            class_name = args.params[0] if len(args.params) > 0 else 'BP_Crate' 
            x = float(args.params[1]) if len(args.params) > 1 else 0.0
            y = float(args.params[2]) if len(args.params) > 2 else 0.0
            z = float(args.params[3]) if len(args.params) > 3 else 200.0
            command_to_send = {
                "intent": "spawn_actor",
                "parameters": {
                    "class": class_name,
                    "location": [x, y, z]
                }
            }
        except (IndexError, ValueError) as e:
            print(f"Invalid parameters for spawn_actor. Example: spawn_actor BP_Crate 100 0 200", file=sys.stderr)
            sys.exit(1)
    else:
        # For now, we only support spawn_actor
        print(f"Unknown command: {args.command}. Only 'spawn_actor' is supported for the MVP.", file=sys.stderr)
        sys.exit(1)

    send_command(args.host, args.port, command_to_send)

if __name__ == "__main__":
    main()
