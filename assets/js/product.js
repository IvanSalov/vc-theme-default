var storefrontApp = angular.module('storefrontApp');

storefrontApp.controller('productController', ['$rootScope', '$scope', '$window', 'dialogService', 'catalogService', 'cartService', 'quoteRequestService', 'customerService', 'listService', '$localStorage', 'customerReviewsService',
    function ($rootScope, $scope, $window, dialogService, catalogService, cartService, quoteRequestService, customerService, listService, $localStorage, customerReviewsService) {
        //TODO: prevent add to cart not selected variation
        // display validator please select property
        // display price range

        var allVariations = [];

        $scope.selectedVariation = {};
        $scope.allVariationPropsMap = {};
        $scope.productPrice = null;
        $scope.productPriceLoaded = false;
        $scope.addToWishlistDisabled = false;
        $scope.availableLists = null;
        $scope.listType = null;

        $scope.addProductToCart = function (product, quantity) {
            var dialogData = toDialogDataModel(product, quantity);
            dialogService.showDialog(dialogData, 'recentlyAddedCartItemDialogController', 'storefront.recently-added-cart-item-dialog.tpl');
            cartService.addLineItem(product.id, quantity).then(function (response) {
                $rootScope.$broadcast('cartItemsChanged');
            });
        };
        $scope.addProductToCartById = function (productId, quantity, event) {
            event.preventDefault();
            catalogService.getProduct([productId]).then(function (response) {
                if (response.data && response.data.length) {
                    var product = response.data[0];
                    $scope.addProductToCart(product, quantity);
                }
            });
        };
        $scope.addProductToWishlist = function (product) {
            var dialogData = toDialogDataModel(product, 1);
            dialogData.listType = $scope.listType;
            dialogService.showDialog(dialogData, 'recentlyAddedListItemDialogController', 'storefront.recently-added-list-item-dialog.tpl');
        };
        $scope.addProductToActualQuoteRequest = function (product, quantity) {
            var dialogData = toDialogDataModel(product, quantity);
            dialogService.showDialog(dialogData, 'recentlyAddedActualQuoteRequestItemDialogController', 'storefront.recently-added-actual-quote-request-item-dialog.tpl');
            quoteRequestService.addProductToQuoteRequest(product.id, quantity).then(function (response) {
                $rootScope.$broadcast('actualQuoteRequestItemsChanged');
            });
        };
        
        $scope.initAvailableLists = function(lists) {
            $scope.listType = lists.default_list_type;
        };

        $scope.addReview = function() {
            var review = {
                authorNickname: $scope.newReviewAuthor,
                content: $scope.newReviewContent,
                value: getRating()
            };

            customerReviewsService.createReview($scope.selectedVariation.id, review).then( function(response) {
                alert('done');
            });
        };

        function getRating() {
            var rating = 0;
            if ($scope.ratingOne) {
                rating = 1;
            }
            if ($scope.ratingTwo) {
                rating = 2;
            }
            if ($scope.ratingThree) {
                rating = 3;
            }
            if ($scope.ratingFour) {
                rating = 4;
            }
            if ($scope.ratingFive) {
                rating = 5;
            }

            return rating;
        }

        function toDialogDataModel(product, quantity) {
            return {
                imageUrl: product.primaryImage ? product.primaryImage.url : null,
                listPrice: product.price.listPrice,
                id: product.id,
                listPriceWithTax: product.price.listPriceWithTax,
                name: product.name,
                placedPrice: product.price.actualPrice,
                placedPriceWithTax: product.price.actualPriceWithTax,
                quantity: quantity,
                updated: false
            };
        }

        function initialize() {
            var productIds = _.map($window.products, function (product) { return product.id });
            if (!productIds || !productIds.length) {
                return;
            }
            catalogService.getProduct(productIds).then(function (response) {
                var product = response.data[0];
                //Current product is also a variation (titular)
                allVariations = [product].concat(product.variations || []);
                $scope.allVariationPropsMap = getFlatternDistinctPropertiesMap(allVariations);

                //Auto select initial product as default variation  (its possible because all our products is variations)
                var propertyMap = getVariationPropertyMap(product);
                _.each(_.keys(propertyMap), function (x) {
                    $scope.checkProperty(propertyMap[x][0]);
                });

                $scope.selectedVariation = product;
            });
        };

        function getFlatternDistinctPropertiesMap(variations) {
            var retVal = {};
            _.each(variations, function (variation) {
                var propertyMap = getVariationPropertyMap(variation);
                //merge
                _.each(_.keys(propertyMap), function (x) {
                    retVal[x] = _.uniq(_.union(retVal[x], propertyMap[x]), "value");
                });
            });
            return retVal;
        };

        function getVariationPropertyMap(variation) {
            return _.groupBy(variation.variationProperties, function (x) { return x.displayName });
        }

        function getSelectedPropsMap(variationPropsMap) {
            var retVal = {};
            _.each(_.keys(variationPropsMap), function (x) {
                var property = _.find(variationPropsMap[x], function (y) {
                    return y.selected;
                });
                if (property) {
                    retVal[x] = [property];
                }
            });
            return retVal;
        }

        function comparePropertyMaps(propMap1, propMap2) {
            return _.every(_.keys(propMap1), function (x) {
                var retVal = propMap2.hasOwnProperty(x);
                if (retVal) {
                    retVal = propMap1[x][0].value == propMap2[x][0].value;
                }
                return retVal;
            });
        };

        function findVariationBySelectedProps(variations, selectedPropMap) {
            return _.find(variations, function (x) {
                return comparePropertyMaps(getVariationPropertyMap(x), selectedPropMap);
            });
        };

        //Method called from View when user clicks one property value
        $scope.checkProperty = function (property) {
            //Select appropriate property and unselect previous selection
            _.each($scope.allVariationPropsMap[property.displayName], function (x) {
                x.selected = x != property ? false : !x.selected;
            });

            //try to find the best variation match for selected properties
            $scope.selectedVariation = findVariationBySelectedProps(allVariations, getSelectedPropsMap($scope.allVariationPropsMap));
        };

        initialize();
    }]);
