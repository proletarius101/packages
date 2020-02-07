import { observable, action, computed } from 'mobx';

import { getToken } from '../../libs/utils';

export interface Config {
  urlBase: string;
  publicUrl: string;
  backendVersion: string;
  coreVersion: string;
  accessToken: string|null;
}

export class ConfigStore {
  @observable
  config: Config = {
    urlBase: '',
    publicUrl: '',
    backendVersion: '',
    coreVersion: '',
    accessToken: getToken(),
  };

  @action
  updateConfig(newConfig: Partial<Config>) {
    Object.assign(this.config, newConfig);
  }

  @computed
  get isReady(): boolean {
    return !!this.config.backendVersion;
  }
}
