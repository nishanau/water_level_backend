import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * Test suite for the AppController
 *
 * These tests verify that the application controller is properly
 * integrated with the application service and returns expected results.
 */
describe('AppController', () => {
  let appController: AppController;

  /**
   * Before each test, create a testing module that includes the controller
   * and its dependencies, then get an instance of the controller for testing.
   */
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  /**
   * Test suite for the root endpoint
   */
  describe('root', () => {
    /**
     * Test that the getHello method returns the expected greeting
     */
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
