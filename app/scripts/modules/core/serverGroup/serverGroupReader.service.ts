import {module} from 'angular';

import {API_SERVICE, Api} from 'core/api/api.service';
import {ServerGroup} from 'core/domain';

export class ServerGroupReaderService {

  static get $inject(): string[] {
    return ['$log', 'API'];
  }

  constructor(private $log: ng.ILogService, private API: Api) {}

  public getScalingActivities(serverGroup: ServerGroup): ng.IPromise<any[]> {
    return this.API
      .one('applications')
      .one(serverGroup.app)
      .all('clusters')
      .all(serverGroup.account)
      .all(serverGroup.cluster)
      .one('serverGroups', serverGroup.name)
      .all('scalingActivities')
      .withParams({
        region: serverGroup.region,
        provider: serverGroup.cloudProvider
      })
      .getList()
      .catch((error: any): any[] => {
        this.$log.error(error, 'error retrieving scaling activities');
        return [];
      });
  }

  public getServerGroup(application: any,
                        account: string,
                        region: string,
                        serverGroupName: string) {
    return this.API.one('applications')
      .one(application)
      .all('serverGroups')
      .all(account)
      .all(region)
      .one(serverGroupName)
      .get();
  }
}

export const SERVER_GROUP_READER_SERVICE = 'spinnaker.core.serverGroup.read.service';
module(SERVER_GROUP_READER_SERVICE, [API_SERVICE])
  .service('serverGroupReader', ServerGroupReaderService);
