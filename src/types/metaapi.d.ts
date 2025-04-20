declare module 'metaapi.cloud-sdk' {
  export default class MetaApi {
    constructor(token: string);
    metatraderAccountApi: {
      createAccount(options: {
        name: string;
        type: string;
        login: string;
        password: string;
        server: string;
        platform: string;
      }): Promise<any>;
      getAccount(accountId: string): Promise<any>;
    };
  }
} 