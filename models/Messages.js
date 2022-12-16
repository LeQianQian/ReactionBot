module.exports = (sequelize, DataTypes) => {
	return sequelize.define('messages', {
		messageId: {
			type: DataTypes.STRING,
            primaryKey: true,
		},
        userId: {
			type: DataTypes.STRING,
			default_value: " ",
            allowNull: false,
		},
        userName: {
            type: DataTypes.STRING,
			default_value: " ",
            allowNull: false,
        },
        upCount: {
            type: DataTypes.INTEGER,
            default_value: 0,
			allowNull: false,
        }
	}, {
		timestamps: false,
	});
};
