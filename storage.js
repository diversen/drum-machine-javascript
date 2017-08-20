function getControlValues() {
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

function setLocalStorage(update) {
    var storage = {};
    storage['Select'] = 'Select';
    
    
    for ( var i = 0, len = localStorage.length; i < len; ++i ) {
        let item = localStorage.key(i);
        storage[item] = item;
    }
    
    // Create select element
    var s = new selectElement(
        'load-storage', // id to append the select list to
        'beat-list', // id of the select list
        storage //
    );
    
    if (update) {
        s.update('beat-list', storage);
    } else {
        s.create();
    }
}

function setupStorage() {

    setLocalStorage();
    document.getElementById('save').addEventListener('click', function (e) {
        e.preventDefault();

        let formData = getControlValues();
        let filename = $('#filename').val();
        if (!filename) {
            filename = 'untitled';
        }

        let beat = getTrackerValues();
        let song = {"beat": beat, "settings": formData}

        localStorage.setItem(filename, JSON.stringify(song));
        setLocalStorage('update');
        setTimeout(function() { alert('Track saved'); }, 1);
    });
    
    document.getElementById('beat-list').addEventListener('change', function (e) {
        let item = $('#beat-list').val();
        if (item === 'Select') {    
            document.getElementById('filename').value = '';
            return;
        }
        
        document.getElementById('filename').value = item;
        let track = JSON.parse(localStorage.getItem(item));
        let formValues = new getSetFormValues();
        let form = document.getElementById("trackerControls");

        formValues.set(form, track.settings);
        audioOptions.setOptions(track.settings);
        schedule.stop();

        initializeSampleSet(ctx, track.settings.sampleSet, track.beat);
   
    });

    document.getElementById('delete').addEventListener('click', function (e) {
        let elem = document.getElementById('beat-list');
        let toDelete = elem.options[elem.selectedIndex].text;
        
        localStorage.removeItem(toDelete);
        document.getElementById('filename').value = '';
        setLocalStorage('update');
        
    });
}

function loadTrackerValues(json) {
    $('.cell').removeClass('enabled');
    json.forEach(function (elem) {
        if (elem.enabled === true) {
            let selector = `[data-row-id="${elem.rowId}"][data-cell-id="${elem.cellId}"]`;
            $(selector).addClass("enabled");
        }
    });
}

function getTrackerValues() {
    let values = [];
    $(".cell").each(function () {
        let val = Object.assign({}, this.dataset);
        val.enabled = $(this).hasClass("enabled");
        values.push(val);
    });
    return values;
}
