import {module, IQService, IPromise} from 'angular';
import {get, intersection} from 'lodash';

import {Application} from 'core/application/application.model';
import {AccountService, ACCOUNT_SERVICE} from 'core/account/account.service';
import {IAppengineAccount} from 'appengine/domain/index';
import {IStage, IPipeline} from 'core/domain/index';
import {AppengineDeployDescription} from '../transformer';

export interface IAppengineServerGroupCommand {
  application?: string;
  stack?: string;
  freeFormDetails?: string;
  appYamlPath?: string;
  branch?: string;
  repositoryUrl?: string;
  credentials: string;
  region: string;
  selectedProvider: string;
  promote?: boolean;
  stopPreviousVersion?: boolean;
  type?: string;
  backingData: any;
  viewState: IViewState;
  strategy?: string;
  strategyApplication?: string;
  strategyPipeline?: string;
}

interface IViewState {
  mode: string;
  submitButtonLabel: string;
  disableStrategySelection: boolean;
}

export class AppengineServerGroupCommandBuilder {
  static get $inject() { return ['$q', 'accountService', 'settings']; }

  constructor(private $q: IQService, private accountService: AccountService, private settings: any) { }

  public buildNewServerGroupCommand(app: Application,
                                    selectedProvider = 'appengine',
                                    mode = 'create'): IPromise<IAppengineServerGroupCommand> {
    let dataToFetch = {
      accounts: this.accountService.getAllAccountDetailsForProvider('appengine'),
    };

    let viewState: IViewState = {
      mode: mode,
      submitButtonLabel: this.getSubmitButtonLabel(mode),
      disableStrategySelection: mode === 'create' ? true : false,
    };

    return this.$q.all(dataToFetch)
      .then((backingData: any) => {
        let credentials: string = this.getCredentials(backingData.accounts, app);
        let region: string = this.getRegion(backingData.accounts, credentials);

        return {
          application: app.name,
          backingData,
          viewState,
          credentials,
          region,
          selectedProvider,
        } as IAppengineServerGroupCommand;
      });
  }

  public buildNewServerGroupCommandForPipeline(stage: IStage, pipeline: IPipeline): void {
    // We can't copy server group configuration for App Engine, and can't build the command here because we don't have
    // access to the application.
    return null;
  }

  public buildServerGroupCommandFromPipeline(app: Application,
                                             cluster: AppengineDeployDescription,
                                             stage: IStage,
                                             pipeline: IPipeline): ng.IPromise<IAppengineServerGroupCommand> {
    return this.buildNewServerGroupCommand(app, 'appengine', 'editPipeline')
      .then((command: IAppengineServerGroupCommand) => {
        Object.assign(command, cluster);
        return command;
      });
  }

  private getCredentials(accounts: IAppengineAccount[], application: Application): string {
    let accountNames: string[] = (accounts || []).map((account) => account.name);
    let defaultCredentials: string = get(this.settings, 'settings.providers.gce.defaults.account') as string;
    let firstApplicationAccount: string = intersection(application.accounts || [], accountNames)[0];

    return accountNames.includes(defaultCredentials) ?
      defaultCredentials :
      (firstApplicationAccount || 'my-appengine-account');
  }

  private getRegion(accounts: IAppengineAccount[], credentials: string): string {
    let account = accounts.find((_account) => _account.name === credentials);
    return account ? account.region : null;
  }

  private getSubmitButtonLabel(mode: string): string {
    switch (mode) {
      case 'createPipeline':
        return 'Add';
      case 'editPipeline':
        return 'Done';
      default:
        return 'Create';
    }
  }
}

export const APPENGINE_SERVER_GROUP_COMMAND_BUILDER = 'spinnaker.appengine.serverGroupCommandBuilder.service';

module(APPENGINE_SERVER_GROUP_COMMAND_BUILDER, [
  ACCOUNT_SERVICE,
]).service('appengineServerGroupCommandBuilder', AppengineServerGroupCommandBuilder);
