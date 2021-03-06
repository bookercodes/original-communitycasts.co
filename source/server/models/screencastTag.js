'use strict';

export default function(sequelize, DataTypes) {
  const ScreencastTag = sequelize.define('ScreencastTag', {
    screencastId: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    tagName: {
      type: DataTypes.STRING,
      primaryKey: true
    }
  }, {
    tableName: 'screencastTags',
    classMethods: {
      associate: function(models) {
        ScreencastTag.belongsTo(models.Screencast, {
          foreignKey: 'screencastId'
        });
      }
    }
  });
  return ScreencastTag;
}
