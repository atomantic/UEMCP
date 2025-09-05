import { ActorSnapToSocketTool } from '../../../src/tools/actors/snap-to-socket.js';
import { ResponseFormatter } from '../../../src/utils/response-formatter.js';

// Create a test class that exposes the protected methods
class TestActorSnapToSocketTool extends ActorSnapToSocketTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testBuildSuccessResponse = jest.fn();
  public testFormatLocation = jest.fn();
  public testFormatRotation = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected buildSuccessResponse(text: string, result: any) {
    return this.testBuildSuccessResponse(text, result);
  }

  protected formatLocation(location: number[]) {
    return this.testFormatLocation(location);
  }

  protected formatRotation(rotation: number[]) {
    return this.testFormatRotation(rotation);
  }
}

describe('ActorSnapToSocketTool', () => {
  let snapToSocketTool: TestActorSnapToSocketTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    snapToSocketTool = new TestActorSnapToSocketTool();
    
    // Set up default mock implementations
    snapToSocketTool.testFormatLocation.mockImplementation((loc: number[]) => `(${loc[0]}, ${loc[1]}, ${loc[2]})`);
    snapToSocketTool.testFormatRotation.mockImplementation((rot: number[]) => `(${rot[0]}°, ${rot[1]}°, ${rot[2]}°)`);
    snapToSocketTool.testBuildSuccessResponse.mockImplementation((text: string, _result: any) => 
      ResponseFormatter.success(text)
    );
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = snapToSocketTool.definition;
      
      expect(definition.name).toBe('actor_snap_to_socket');
      expect(definition.description).toContain('Snap an actor to another actor\'s socket');
      expect(definition.description).toContain('Examples:');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).required).toEqual(['sourceActor', 'targetActor', 'targetSocket']);
    });

    it('should have correct sourceActor property', () => {
      const definition = snapToSocketTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.sourceActor).toBeDefined();
      expect(properties.sourceActor.type).toBe('string');
      expect(properties.sourceActor.description).toContain('actor to snap');
    });

    it('should have correct targetActor property', () => {
      const definition = snapToSocketTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.targetActor).toBeDefined();
      expect(properties.targetActor.type).toBe('string');
      expect(properties.targetActor.description).toContain('target actor with the socket');
    });

    it('should have correct targetSocket property', () => {
      const definition = snapToSocketTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.targetSocket).toBeDefined();
      expect(properties.targetSocket.type).toBe('string');
      expect(properties.targetSocket.description).toContain('socket on the target actor');
    });

    it('should have optional sourceSocket property', () => {
      const definition = snapToSocketTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.sourceSocket).toBeDefined();
      expect(properties.sourceSocket.type).toBe('string');
      expect(properties.sourceSocket.description).toContain('Optional socket');
      expect((definition.inputSchema as any).required).not.toContain('sourceSocket');
    });

    it('should have correct offset array schema', () => {
      const definition = snapToSocketTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.offset).toBeDefined();
      expect(properties.offset.type).toBe('array');
      expect(properties.offset.items.type).toBe('number');
      expect(properties.offset.minItems).toBe(3);
      expect(properties.offset.maxItems).toBe(3);
      expect(properties.offset.default).toEqual([0, 0, 0]);
    });

    it('should have correct validate property with default', () => {
      const definition = snapToSocketTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.validate).toBeDefined();
      expect(properties.validate.type).toBe('boolean');
      expect(properties.validate.default).toBe(true);
      expect(properties.validate.description).toContain('Validate the snap operation');
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock successful Python command execution
      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [100, 200, 300],
        newRotation: [0, 90, 0],
      });
    });

    it('should snap actor with minimal arguments', async () => {
      const args = {
        sourceActor: 'Door_01',
        targetActor: 'Wall_01',
        targetSocket: 'DoorSocket',
      };

      await snapToSocketTool.testExecute(args);

      expect(snapToSocketTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.snap_to_socket', args);
      
      expect(snapToSocketTool.testFormatLocation).toHaveBeenCalledWith([100, 200, 300]);
      expect(snapToSocketTool.testFormatRotation).toHaveBeenCalledWith([0, 90, 0]);
      
      expect(snapToSocketTool.testBuildSuccessResponse).toHaveBeenCalledWith(
        expect.stringContaining('✓ Snapped Door_01 to Wall_01\'s socket'),
        expect.any(Object)
      );
    });

    it('should snap actor with all arguments', async () => {
      const args = {
        sourceActor: 'Door_02',
        targetActor: 'Frame_01',
        targetSocket: 'AttachPoint',
        sourceSocket: 'HingeSocket',
        offset: [5, 0, 10],
        validate: true,
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [150, 250, 350],
        newRotation: [0, 0, 45],
        validation: { success: true },
      });

      await snapToSocketTool.testExecute(args);

      expect(snapToSocketTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.snap_to_socket', args);
      
      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Snapped Door_02 to Frame_01\'s socket');
      expect(buildResponseCall).toContain('Target Socket: AttachPoint');
      expect(buildResponseCall).toContain('Source Socket: HingeSocket');
      expect(buildResponseCall).toContain('New Location: (150, 250, 350)');
      expect(buildResponseCall).toContain('New Rotation: (0°, 0°, 45°)');
      expect(buildResponseCall).toContain('Offset Applied: (5, 0, 10)');
    });

    it('should handle zero offset without showing offset applied', async () => {
      const args = {
        sourceActor: 'Window_01',
        targetActor: 'Wall_02',
        targetSocket: 'WindowSocket',
        offset: [0, 0, 0],
      };

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).not.toContain('Offset Applied');
    });

    it('should handle partial non-zero offset', async () => {
      const args = {
        sourceActor: 'Decoration_01',
        targetActor: 'Shelf_01',
        targetSocket: 'ItemSocket',
        offset: [0, 5, 0],
      };

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('Offset Applied: (0, 5, 0)');
    });

    it('should handle missing newLocation and newRotation in result', async () => {
      const args = {
        sourceActor: 'Actor_01',
        targetActor: 'Actor_02',
        targetSocket: 'Socket_01',
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // No newLocation or newRotation
      });

      await snapToSocketTool.testExecute(args);

      expect(snapToSocketTool.testFormatLocation).toHaveBeenCalledWith([0, 0, 0]);
      expect(snapToSocketTool.testFormatRotation).toHaveBeenCalledWith([0, 0, 0]);
    });

    it('should handle validation success without showing warning', async () => {
      const args = {
        sourceActor: 'TestActor',
        targetActor: 'TargetActor',
        targetSocket: 'TestSocket',
        validate: true,
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [0, 0, 0],
        newRotation: [0, 0, 0],
        validation: { success: true },
      });

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).not.toContain('⚠️ Validation Warning');
    });

    it('should show validation warning when validation fails', async () => {
      const args = {
        sourceActor: 'ProblemActor',
        targetActor: 'TargetActor',
        targetSocket: 'Socket',
        validate: true,
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [0, 0, 0],
        newRotation: [0, 0, 0],
        validation: { 
          success: false, 
          message: 'Socket alignment may be imprecise' 
        },
      });

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('⚠️ Validation Warning: Socket alignment may be imprecise');
    });

    it('should show default validation warning message when no message provided', async () => {
      const args = {
        sourceActor: 'Actor',
        targetActor: 'Target',
        targetSocket: 'Socket',
        validate: true,
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [0, 0, 0],
        newRotation: [0, 0, 0],
        validation: { success: false },
      });

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('⚠️ Validation Warning: Position may not be exact');
    });

    it('should not show validation warning when validate is false', async () => {
      const args = {
        sourceActor: 'Actor',
        targetActor: 'Target',
        targetSocket: 'Socket',
        validate: false,
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [0, 0, 0],
        newRotation: [0, 0, 0],
        validation: { success: false, message: 'Some error' },
      });

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).not.toContain('⚠️ Validation Warning');
    });

    it('should not show validation warning when no validation in result', async () => {
      const args = {
        sourceActor: 'Actor',
        targetActor: 'Target',
        targetSocket: 'Socket',
        validate: true,
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [0, 0, 0],
        newRotation: [0, 0, 0],
        // No validation property
      });

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).not.toContain('⚠️ Validation Warning');
    });

    it('should handle complex socket names and actor names', async () => {
      const args = {
        sourceActor: 'BP_ComplexDoor_Instance_01',
        targetActor: 'SM_ModularWall_Corner_Prefab',
        targetSocket: 'Door_Attachment_Point_Primary',
        sourceSocket: 'Hinge_Connection_Socket_Left',
        offset: [2.5, -1.0, 0.5],
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [1250.5, 875.2, 125.7],
        newRotation: [2.1, 87.3, 0.8],
      });

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('BP_ComplexDoor_Instance_01 to SM_ModularWall_Corner_Prefab');
      expect(buildResponseCall).toContain('Target Socket: Door_Attachment_Point_Primary');
      expect(buildResponseCall).toContain('Source Socket: Hinge_Connection_Socket_Left');
      expect(buildResponseCall).toContain('Offset Applied: (2.5, -1, 0.5)');
      expect(snapToSocketTool.testFormatLocation).toHaveBeenCalledWith([1250.5, 875.2, 125.7]);
      expect(snapToSocketTool.testFormatRotation).toHaveBeenCalledWith([2.1, 87.3, 0.8]);
    });

    it('should handle negative offset values', async () => {
      const args = {
        sourceActor: 'TestActor',
        targetActor: 'TargetActor',
        targetSocket: 'Socket',
        offset: [-10, -20, -5],
      };

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('Offset Applied: (-10, -20, -5)');
    });

    it('should pass all arguments to Python command correctly', async () => {
      const args = {
        sourceActor: 'Source',
        targetActor: 'Target', 
        targetSocket: 'TargetSocket',
        sourceSocket: 'SourceSocket',
        offset: [1, 2, 3],
        validate: false,
      };

      await snapToSocketTool.testExecute(args);

      expect(snapToSocketTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.snap_to_socket', args);
    });

    it('should handle result with non-array location and rotation gracefully', async () => {
      const args = {
        sourceActor: 'Actor',
        targetActor: 'Target',
        targetSocket: 'Socket',
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: 'invalid',
        newRotation: null,
      });

      await snapToSocketTool.testExecute(args);

      // The code casts result.newLocation as number[] but doesn't validate
      // So truthy non-arrays are passed through, falsy values get default
      expect(snapToSocketTool.testFormatLocation).toHaveBeenCalledWith('invalid');
      expect(snapToSocketTool.testFormatRotation).toHaveBeenCalledWith([0, 0, 0]);
    });

    it('should call buildSuccessResponse with correct parameters', async () => {
      const args = {
        sourceActor: 'TestActor',
        targetActor: 'TestTarget',
        targetSocket: 'TestSocket',
      };

      const mockResult = {
        success: true,
        newLocation: [100, 200, 300],
        newRotation: [0, 90, 0],
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue(mockResult);

      await snapToSocketTool.testExecute(args);

      expect(snapToSocketTool.testBuildSuccessResponse).toHaveBeenCalledWith(
        expect.stringContaining('✓ Snapped TestActor to TestTarget\'s socket'),
        mockResult
      );
    });
  });

  describe('edge cases', () => {
    it('should handle undefined offset gracefully', async () => {
      const args = {
        sourceActor: 'Actor',
        targetActor: 'Target',
        targetSocket: 'Socket',
        offset: undefined,
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [0, 0, 0],
        newRotation: [0, 0, 0],
      });

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).not.toContain('Offset Applied');
    });

    it('should handle validate undefined', async () => {
      const args = {
        sourceActor: 'Actor',
        targetActor: 'Target',
        targetSocket: 'Socket',
        validate: undefined,
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [0, 0, 0],
        newRotation: [0, 0, 0],
        validation: { success: false, message: 'Error' },
      });

      await snapToSocketTool.testExecute(args);

      // Should not show validation warning when validate is undefined
      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).not.toContain('⚠️ Validation Warning');
    });

    it('should handle empty strings in actor names', async () => {
      const args = {
        sourceActor: '',
        targetActor: '',
        targetSocket: '',
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [0, 0, 0],
        newRotation: [0, 0, 0],
      });

      await snapToSocketTool.testExecute(args);

      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Snapped  to \'s socket');
      expect(buildResponseCall).toContain('Target Socket: ');
    });

    it('should handle validation object without success property', async () => {
      const args = {
        sourceActor: 'Actor',
        targetActor: 'Target',
        targetSocket: 'Socket',
        validate: true,
      };

      snapToSocketTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        newLocation: [0, 0, 0],
        newRotation: [0, 0, 0],
        validation: { message: 'Some message' }, // No success property
      });

      await snapToSocketTool.testExecute(args);

      // Should show warning when success is falsy/undefined
      const buildResponseCall = snapToSocketTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('⚠️ Validation Warning: Some message');
    });
  });
});