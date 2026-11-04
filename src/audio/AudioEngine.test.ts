import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from './AudioEngine';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function capture() {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  return { stream, stop };
}

class FakeAudioContext {
  state = 'running';
  sampleRate = 48000;
  close = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);
  createAnalyser = vi.fn(() => ({}));
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
}

afterEach(() => vi.unstubAllGlobals());

describe('AudioEngine startup ownership', () => {
  it('releases capture resolved after stop', async () => {
    const { stream, stop } = capture();
    const pending = deferred<MediaStream>();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => pending.promise } });
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const engine = new AudioEngine();

    const started = engine.start();
    engine.stop();
    pending.resolve(stream);

    expect(await started).toBe(false);
    expect(engine.running).toBe(false);
    expect(stop).toHaveBeenCalledOnce();
  });

  it('closes the context and stops tracks while resume is pending', async () => {
    const { stream, stop } = capture();
    const pending = deferred<void>();
    const context = new FakeAudioContext();
    context.state = 'suspended';
    context.resume.mockReturnValue(pending.promise);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => stream } });
    vi.stubGlobal('AudioContext', function () {
      return context;
    });
    const engine = new AudioEngine();

    const started = engine.start();
    await Promise.resolve();
    expect(context.resume).toHaveBeenCalledOnce();
    engine.stop();
    expect(stop).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
    pending.resolve(undefined);

    expect(await started).toBe(false);
    expect(engine.running).toBe(false);
    expect(context.createAnalyser).not.toHaveBeenCalled();
  });

  it.each(['constructor', 'resume', 'analyser'] as const)(
    'releases partially acquired resources when %s fails',
    async (failure) => {
      const { stream, stop } = capture();
      const context = new FakeAudioContext();
      context.state = 'suspended';
      if (failure === 'resume') context.resume.mockRejectedValue(new Error('resume failed'));
      if (failure === 'analyser')
        context.createAnalyser.mockImplementation(() => {
          throw new Error('analyser failed');
        });
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => stream } });
      vi.stubGlobal('AudioContext', function () {
        if (failure === 'constructor') throw new Error('constructor failed');
        return context;
      });
      const engine = new AudioEngine();

      expect(await engine.start()).toBe(false);
      expect(engine.running).toBe(false);
      expect(engine.error).not.toBeNull();
      expect(stop).toHaveBeenCalledOnce();
      expect(context.close).toHaveBeenCalledTimes(failure === 'constructor' ? 0 : 1);
    },
  );

  it.each(['resolve', 'reject'] as const)(
    'keeps a newer start running when an older capture %ss',
    async (outcome) => {
      const older = capture();
      const newer = capture();
      const pending = deferred<MediaStream>();
      const getUserMedia = vi
        .fn()
        .mockReturnValueOnce(pending.promise)
        .mockResolvedValueOnce(newer.stream);
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
      vi.stubGlobal('AudioContext', FakeAudioContext);
      const engine = new AudioEngine();

      const started = engine.start();
      expect(await engine.start()).toBe(true);
      if (outcome === 'resolve') pending.resolve(older.stream);
      else pending.reject(new Error('capture failed'));

      expect(await started).toBe(false);
      expect(engine.running).toBe(true);
      expect(engine.error).toBeNull();
      expect(older.stop).toHaveBeenCalledTimes(outcome === 'resolve' ? 1 : 0);
      expect(newer.stop).not.toHaveBeenCalled();
      engine.stop();
      expect(newer.stop).toHaveBeenCalledOnce();
    },
  );
});
