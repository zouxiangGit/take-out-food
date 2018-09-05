const loadAllItems = require('./items');
const loadPromotions = require('./promotions');
const _ = require('lodash');
module.exports = function bestCharge(selectedItems) {
  return _.flow([
    parseSelectedItems,
    getOrderInfo,
    calculatePromotion,
    renderDataToString
  ])(selectedItems);
}

const renderDataToString = function (finalOrderInfo) {
  let result = '';
  result += '============= 订餐明细 =============\n';
  finalOrderInfo.selectedItems.forEach(selectedItem => result += `${selectedItem.item.name} x ${selectedItem.count} = ${selectedItem.totalPrice}元\n`);
  result += '-----------------------------------\n';
  if (finalOrderInfo.isPromotion) {
    result += '使用优惠:\n';
    result += `${finalOrderInfo.promotionMessage}\n`;
    result += '-----------------------------------\n';
  }
  result += `总计：${finalOrderInfo.finalTotalPrice}元\n`;
  result += '===================================';
  return result;
}

const calculatePromotion = function (orderInfo) {
  let bestPromotion = promotionHandlers
    .map(promotionHandler => promotionHandler(orderInfo))
    .filter(promotionInfo => promotionInfo.isPromotion)
    .reduce((best, promotionInfo) => best.finalTotalPrice > promotionInfo.finalTotalPrice ? promotionInfo : best, {finalTotalPrice: orderInfo.totalPrice});
  return Object.assign(bestPromotion, orderInfo);
}

const getOrderInfo = function (selectedItems) {
  selectedItems.forEach(selectedItem => selectedItem.totalPrice = selectedItem.item.price * selectedItem.count);
  let totalPrice = selectedItems.reduce((sum, selectedItem) => sum + selectedItem.totalPrice, 0);
  return {selectedItems, totalPrice};
}

const parseSelectedItems = function (selectedItemStrs) {
  return selectedItemStrs.map(selectedItem => parseSelectedItem(selectedItem))
}
const parseSelectedItem = function (selectedItem) {
  [itemId, itemCount] = selectedItem.split(' x ');
  return {item: getItemById(itemId), count: parseInt(itemCount)};
}
const getItemById = function (id) {
  return loadAllItems().find(item => item.id === id);
}
const upTo30Minus6Handler = function (orderInfo) {
  if (orderInfo.totalPrice < 30) {
    return {finalTotalPrice: orderInfo.totalPrice};
  }
  return {
    finalTotalPrice: orderInfo.totalPrice - 6,
    promotionMessage: '满30减6元，省6元',
    isPromotion: true
  };
}
const halfHandler = function (orderInfo) {
  let halfItemIds = loadPromotions()[1].items;
  let halfSelectedItems = orderInfo.selectedItems.filter(selectedItem => halfItemIds.includes(selectedItem.item.id));
  let reducedPrice = halfSelectedItems
    .reduce((reducedPrice, halfSelectedItem) => reducedPrice + halfSelectedItem.item.price * 0.5 * halfSelectedItem.count, 0);
  if (reducedPrice === 0) {
    return {finalTotalPrice: orderInfo.totalPrice};
  }
  let halfItemsStr = halfSelectedItems.map(halfSelectedItem => halfSelectedItem.item.name).join('，');
  return {
    finalTotalPrice: orderInfo.totalPrice - reducedPrice,
    promotionMessage: `指定菜品半价(${halfItemsStr})，省${reducedPrice}元`,
    isPromotion: true
  };
}
const promotionHandlers = [upTo30Minus6Handler, halfHandler];
