import { Controller, Get, Res, Header, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import got from 'got';

import { SurgioService } from './surgio/surgio.service';

@Controller()
export class AppController {
  constructor(private readonly surgioService: SurgioService) {}

  @Get()
  @Header('content-type', 'text/html; charset=utf8')
  public getIndex(): string {
    return '<h1>Surgio Gateway</h1>';
  }

  @Get('/robots.txt')
  public getRobots(): string {
    return 'User-agent: *\n' +
      'Disallow: /';
  }

  @Get('get-artifact/:name')
  public async getArtifact(@Res() res, @Param() params, @Query() query): Promise<void> {
    const dl = query.dl;
    const format = query.format;
    const filter = query.filter;
    const artifactName = params.name;
    const result = format !== void 0 ?
      await this.surgioService.transformArtifact(artifactName as string, format as string, filter as string) :
      await this.surgioService.getArtifact(artifactName as string);

    if (result instanceof HttpException) {
      throw result;
    }

    if (typeof result === 'string') {
      res.header('content-type', 'text/plain; charset=utf-8');
      res.header('cache-control', 'private, no-cache, no-stores');

      if (dl === '1') {
        res.header('content-disposition', `attachment; filename="${artifactName}"`);
      }

      res.send(result);
    } else {
      throw new HttpException('NOT FOUND', HttpStatus.NOT_FOUND);
    }
  }

  @Get('qx-script')
  public async getQxScript(@Res() res, @Query() query): Promise<void> {
    const { url, id: idFromUrl } = query;
    const idFromConfig = this.surgioService?.surgioHelper.config?.quantumultXConfig?.deviceIds;
    const deviceIds = idFromUrl ? idFromUrl.split(',') : (idFromConfig || []);

    if (!url) {
      throw new HttpException('invalid url', HttpStatus.BAD_REQUEST);
    }

    const content = await got.get(url)
      // istanbul ignore next
      .catch(err => {
        throw new HttpException(`请求文件时出错: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      });
    const contentType: string = content.headers['content-type'];

    if (
      !contentType ||
      (
        !contentType.includes('text/plain') &&
        !contentType.includes('application/javascript')
      )
    ) {
      throw new HttpException('该文件不是一个可转换的脚本文件', HttpStatus.BAD_REQUEST);
    }

    const insertion = '' +
      '/**\n' +
      ' * @supported ' + `${deviceIds.join(' ')}` + '\n' +
      ' * THIS COMMENT IS GENERATED BY SURGIO\n' +
      ' */\n\n';

    res.header('content-type', contentType);
    res.header('content-disposition', 'attachment;filename=script.js');
    res.header('cache-control', 'max-age=3600, s-maxage=3600');
    res.send( insertion + content.body);
  }
}
