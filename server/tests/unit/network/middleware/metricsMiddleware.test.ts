import { Request, Response, NextFunction } from 'express';
import { metricsMiddleware } from '../../../../src/network/middleware/metricsMiddleware';

// Mock logger
jest.mock('../../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock metrics
jest.mock('../../../../src/utils/metrics', () => ({
  httpRequestDuration: {
    observe: jest.fn(),
  },
  httpRequestTotal: {
    inc: jest.fn(),
  },
}));

import {
  httpRequestDuration,
  httpRequestTotal,
} from '../../../../src/utils/metrics';

describe('metricsMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/players',
      route: { path: '/players' },
      get: jest.fn().mockReturnValue('test-agent'),
    };

    mockRes = {
      statusCode: 200,
      on: jest.fn(),
      setHeader: jest.fn(),
    };

    nextFn = jest.fn();

    jest.clearAllMocks();
  });

  it('should call next function', () => {
    metricsMiddleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
  });

  it('should register finish event listener', () => {
    metricsMiddleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should log and record metrics on finish', () => {
    metricsMiddleware(mockReq as Request, mockRes as Response, nextFn);

    // Get the finish callback
    const finishCallback = (mockRes.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === 'finish',
    )[1];

    // Trigger finish
    finishCallback();

    // Verify metrics were recorded
    expect(httpRequestDuration.observe).toHaveBeenCalled();
    expect(httpRequestTotal.inc).toHaveBeenCalled();
  });

  it('should handle missing route', () => {
    mockReq.route = undefined;

    metricsMiddleware(mockReq as Request, mockRes as Response, nextFn);

    const finishCallback = (mockRes.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === 'finish',
    )[1];

    finishCallback();

    expect(httpRequestDuration.observe).toHaveBeenCalledWith(
      expect.objectContaining({
        route: '/api/players',
      }),
      expect.any(Number),
    );
  });
});
