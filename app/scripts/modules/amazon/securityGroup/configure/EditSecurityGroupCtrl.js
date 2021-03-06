'use strict';

import _ from 'lodash';

let angular = require('angular');
import {ACCOUNT_SERVICE} from 'core/account/account.service';

module.exports = angular.module('spinnaker.securityGroup.aws.edit.controller', [
  require('angular-ui-router'),
  ACCOUNT_SERVICE,
  require('core/task/monitor/taskMonitorService.js'),
  require('core/securityGroup/securityGroup.write.service.js'),
])
  .controller('awsEditSecurityGroupCtrl', function($scope, $uibModalInstance, $state,
                                                accountService, securityGroupReader,
                                                taskMonitorService, application,
                                                securityGroup, securityGroupWriter, $controller) {

    $scope.pages = {
      ingress: require('./createSecurityGroupIngress.html'),
    };

    $scope.securityGroup = securityGroup;

    $scope.state = {
      refreshingSecurityGroups: false,
    };

    $scope.securityGroup.regions = [$scope.securityGroup.region];
    $scope.securityGroup.credentials = $scope.securityGroup.accountName;

    angular.extend(this, $controller('awsConfigSecurityGroupMixin', {
      $scope: $scope,
      $uibModalInstance: $uibModalInstance,
      application: application,
      securityGroup: securityGroup,
    }));

    $scope.state.isNew = false;

    $scope.taskMonitor = taskMonitorService.buildTaskMonitor({
      application: application,
      title: 'Updating your security group',
      modalInstance: $uibModalInstance,
      onTaskComplete: () => application.securityGroups.refresh(),
    });

    securityGroup.securityGroupIngress = _.chain(securityGroup.inboundRules)
      .filter(rule => rule.securityGroup)
      .map(rule => rule.portRanges.map(portRange => {
          let vpcId = rule.securityGroup.vpcId === securityGroup.vpcId ? null : rule.securityGroup.vpcId;
          return {
            accountName: rule.securityGroup.accountName || rule.securityGroup.accountId,
            accountId: rule.securityGroup.accountId,
            vpcId: vpcId,
            id: rule.securityGroup.id,
            name: rule.securityGroup.inferredName ? null : rule.securityGroup.name,
            type: rule.protocol,
            startPort: portRange.startPort,
            endPort: portRange.endPort,
            existing: true,
          };
        })
      )
      .flatten()
      .value();

    securityGroup.ipIngress = _.chain(securityGroup.inboundRules)
      .filter(function(rule) {
        return rule.range;
      }).map(function(rule) {
        return rule.portRanges.map(function(portRange) {
          return {
            cidr: rule.range.ip + rule.range.cidr,
            type: rule.protocol,
            startPort: portRange.startPort,
            endPort: portRange.endPort
          };
        });
      })
      .flatten()
      .value();

    $scope.taskMonitor.onApplicationRefresh = $uibModalInstance.dismiss;

    this.upsert = function () {

      let group = $scope.securityGroup;
      let command = {
        credentials: group.accountName,
        name: group.name,
        description: group.description,
        vpcId: group.vpcId,
        region: group.region,
        securityGroupIngress: group.securityGroupIngress,
        ipIngress: group.ipIngress
      };

      $scope.taskMonitor.submit(
        function() {
          return securityGroupWriter.upsertSecurityGroup(command, application, 'Update');
        }
      );
    };

    this.cancel = function () {
      $uibModalInstance.dismiss();
    };

    this.initializeSecurityGroups().then(this.initializeAccounts);
  });
