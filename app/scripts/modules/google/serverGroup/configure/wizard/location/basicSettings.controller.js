'use strict';

import {Observable, Subject} from 'rxjs';
import {V2_MODAL_WIZARD_SERVICE} from 'core/modal/wizard/v2modalWizard.service';
import {NAMING_SERVICE} from 'core/naming/naming.service';

let angular = require('angular');

module.exports = angular.module('spinnaker.google.serverGroup.configure.wizard.basicSettings.controller', [
  require('angular-ui-router'),
  require('angular-ui-bootstrap'),
  require('core/serverGroup/configure/common/basicSettingsMixin.controller.js'),
  V2_MODAL_WIZARD_SERVICE,
  require('core/image/image.reader.js'),
  NAMING_SERVICE,
  require('../../../../gceRegionSelectField.directive.js'),
  require('../../../../gceNetworkSelectField.directive.js'),
  require('../../../../subnet/subnetSelectField.directive.js'),
])
  .controller('gceServerGroupBasicSettingsCtrl', function($scope, $controller, $uibModalStack, $state,
                                                          v2modalWizardService, imageReader, namingService) {

    function searchImages(q) {
      $scope.command.backingData.filtered.images = [
        {
          message: '<span class="glyphicon glyphicon-spinning glyphicon-asterisk"></span> Finding results matching "' + q + '"...'
        }
      ];
      return Observable.fromPromise(
        imageReader.findImages({
          provider: $scope.command.selectedProvider,
          q: q,
        })
      );
    }

    var imageSearchResultsStream = new Subject();

    imageSearchResultsStream
      .debounceTime(250)
      .switchMap(searchImages)
      .subscribe(function (data) {
        $scope.command.backingData.filtered.images = data.map(function(image) {
          if (image.message && !image.imageName) {
            return image;
          }
          return {
            account: image.account,
            imageName: image.imageName,
          };
        });
        $scope.command.backingData.packageImages = $scope.command.backingData.filtered.images;
      });

    this.searchImages = function(q) {
      imageSearchResultsStream.next(q);
    };

    this.enableAllImageSearch = () => {
      $scope.command.viewState.useAllImageSelection = true;
      this.searchImages('');
    };

    angular.extend(this, $controller('BasicSettingsMixin', {
      $scope: $scope,
      imageReader: imageReader,
      namingService: namingService,
      $uibModalStack: $uibModalStack,
      $state: $state,
    }));

    this.stackPattern = {
      test: function(stack) {
        var pattern = $scope.command.viewState.templatingEnabled ?
          /^([a-zA-Z0-9]*(\${.+})*)*$/ :
          /^[a-zA-Z0-9]*$/;
        return pattern.test(stack);
      }
    };

    this.detailPattern = {
      test: function(detail) {
        var pattern = $scope.command.viewState.templatingEnabled ?
          /^([a-zA-Z0-9-]*(\${.+})*)*$/ :
          /^[a-zA-Z0-9-]*$/;
        return pattern.test(detail);
      }
    };

    this.getSubnetPlaceholder = () => {
      if (!$scope.command.region) {
        return '(Select an account)';
      } else if ($scope.command.viewState.autoCreateSubnets) {
        return '(Subnet will be automatically selected)';
      } else if ($scope.command.viewState.autoCreateSubnets === null) {
        return '(Subnets not supported)';
      } else {
        return null;
      }
    };

  });
