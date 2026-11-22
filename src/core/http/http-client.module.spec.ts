import { Test } from '@nestjs/testing';
import { HttpClientModule } from './http-client.module.js';
import { HttpClientService } from './http-client.service.js';

describe('HttpClientModule', () => {
  it('fournit HttpClientService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HttpClientModule],
    }).compile();

    expect(moduleRef.get(HttpClientService)).toBeInstanceOf(HttpClientService);

    await moduleRef.close();
  });

  it('exporte HttpClientService à ses importeurs', async () => {
    const exported = Reflect.getMetadata('exports', HttpClientModule) as
      unknown[] | undefined;

    expect(exported).toContain(HttpClientService);
  });

  it('n est pas un module global', () => {
    expect(
      Reflect.getMetadata('__module:global__', HttpClientModule),
    ).toBeFalsy();
  });
});
