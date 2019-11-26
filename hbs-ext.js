var blocks = {};

module.exports.setup = function(hbs) {
    hbs.registerHelper('extend', function(name, context) {
        var block = blocks[name];
        if (!block) {
            block = blocks[name] = [];
        }

        block.push(context.fn(this)); 
    });

    hbs.registerHelper('block', function(name) {
        var val = (blocks[name] || []).join('\n');

        blocks[name] = [];
        return val;
    });

    hbs.registerHelper("valueIsTrue", function(obj, value, options) {
        if (obj && obj[value]) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });

    hbs.registerHelper("emptyOrNull", function(value, options) {
        if (value == undefined || value == null || value == "") {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });

    hbs.registerHelper("equal", function(lhs, rhs, options) {
        if (lhs == rhs) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });
}