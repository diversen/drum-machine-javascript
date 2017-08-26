const getSetFormValues = require('get-set-form-values');

/**
 * Get all tracker values from HTML
 * @returns {object}
 */
function getTrackerControls() {
    let formValues = new getSetFormValues();
    let form = document.getElementById("trackerControls");
    let values = formValues.get(form);
    
    let ret = {};
    for (let key in values) {
        
        if (key === 'delayEnabled') {
            ret[key] = 'true';
            continue;
        }
        
        if (key === 'sampleSet') { 
            ret[key] = values[key];
            continue;
        }
        ret[key] = parseFloat(values[key]);
    }
    return ret;
}

module.exports = getTrackerControls;
