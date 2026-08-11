var dropdownData = [];
var position = -1;
var recordId = '';
var findMode = false;
var original = {};
var pendingNav = null;

function updateNextBtnState() {
    var isNew = document.getElementById('new_btn').classList.contains('active');
    document.getElementById('next_btn').disabled = isNew;
}

function setToggleActive(mode) {
    var findBtn = document.getElementById('find_btn');
    var newBtn = document.getElementById('new_btn');
    if (mode === 'Find') {
        findBtn.classList.add('active');
        newBtn.classList.remove('active');
    } else {
        newBtn.classList.add('active');
        findBtn.classList.remove('active');
    }
    updateNextBtnState();
}

function showModal(msg) {
    document.getElementById('modal_text').innerText = msg;
    document.getElementById('custom_modal').showModal();
}

document.getElementById('modal_close_btn').addEventListener('click', function() {
    document.getElementById('custom_modal').close();
});

function setMsg(text, color, clearAfterMs) {
    var box = document.getElementById('form_msg');
    box.innerText = text;
    box.style.color = color || 'green';

    if (window.msgTimer) clearTimeout(window.msgTimer);

    if (clearAfterMs) {
        window.msgTimer = setTimeout(function() {
            var btn = document.getElementById('save_btn');
            box.innerText = (btn.innerText === 'Update')
                ? 'LOV record loaded. Edit and click Update.'
                : 'Ready to add new option.';
            box.style.color = 'green';
        }, clearAfterMs);
    }
}

function markFieldError(field) {
    field.style.borderColor = '#ef4444';
    field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
    field.addEventListener('input', function clear() {
        field.style.borderColor = '';
        field.style.boxShadow = '';
        field.removeEventListener('input', clear);
    });
}

function saveOriginal() {
    original = {
        field_name:   document.getElementById('field_name').value,
        option_value: document.getElementById('option_value').value,
        is_active:    document.getElementById('is_active').value
    };
}

function hasChanged() {
    return (
        document.getElementById('field_name').value   !== original.field_name   ||
        document.getElementById('option_value').value !== original.option_value ||
        document.getElementById('is_active').value    !== original.is_active
    );
}

function fillForm(row) {
    document.getElementById('field_name').value   = row.lov_type  || '';
    document.getElementById('option_value').value = row.lov_value || '';
    document.getElementById('is_active').value    = row.is_active || '';
    document.getElementById('save_btn').innerText = 'Update';
    saveOriginal();
    updateNextBtnState();
    setToggleActive('Find');
    document.getElementById('prev_btn').disabled = false;
}

async function fetchAllLOVs() {
    try {
        var res = await fetch('/api/get-all-lov');
        dropdownData = await res.json();
    } catch (e) {
        setMsg('Unable to load LOV records from database.', 'red', 2500);
    }
}

window.onload = function() {
    fetchAllLOVs();
    document.getElementById('field_name').value   = '';
    document.getElementById('option_value').value = '';
    document.getElementById('is_active').value    = '';
    setMsg('Ready to add new option.', 'green');
    updateNextBtnState();
    document.getElementById('prev_btn').disabled = false;
};

document.getElementById('find_btn').addEventListener('click', function() {
    var fieldNameField = document.getElementById('field_name');
    var val = fieldNameField.value.trim();
    setToggleActive('Find');
    updateNextBtnState();

    if (val === '') {
        markFieldError(fieldNameField);
        setMsg('Please type a Field Name to search!', 'red', 2500);
        fieldNameField.focus();
        return;
    }

    var foundIdx = -1;
    for (var i = 0; i < dropdownData.length; i++) {
        if (dropdownData[i][1].toUpperCase() === val.toUpperCase()) {
            foundIdx = i;
            break;
        }
    }

    if (foundIdx !== -1) {
        position = foundIdx;
        recordId = dropdownData[position][0];
        findMode = true;
        fillForm({
            lov_type:  dropdownData[position][1],
            lov_value: dropdownData[position][2],
            is_active: dropdownData[position][3]
        });
        setMsg('LOV record loaded. Edit and click Update.', 'green');
    } else {
        setMsg("We couldn't find any options under that Field Name.", 'red', 2500);
        position = -1;
        recordId = '';
        setToggleActive('New');
        document.getElementById('prev_btn').disabled = false;
    }
});

document.getElementById('new_btn').addEventListener('click', function() {
    if (findMode && hasChanged()) {
        showUnsavedDialog(function() {
            clearForm();
        });
    } else {
        clearForm();
    }
});

function clearForm() {
    document.getElementById('field_name').value   = '';
    document.getElementById('option_value').value = '';
    document.getElementById('is_active').value    = '';
    document.getElementById('save_btn').innerText = 'Save';
    position = -1;
    recordId = '';
    findMode = false;
    updateNextBtnState();
    setToggleActive('New');
    document.getElementById('prev_btn').disabled = false;
    setMsg('Ready to add new option.', 'green');
    document.getElementById('field_name').focus();
}

async function submitForm() {
    var fieldNameField = document.getElementById('field_name');
    var optionField    = document.getElementById('option_value');
    var isActiveField  = document.getElementById('is_active');

    var emptyFields = [];
    [fieldNameField, optionField, isActiveField].forEach(function(field) {
        if (field.value.trim() === '') {
            emptyFields.push(field);
            markFieldError(field);
        }
    });

    if (emptyFields.length > 0) {
        setMsg('Please fill in all required fields.', 'red', 2500);
        emptyFields[0].focus();
        return false;
    }

    var isActiveVal = isActiveField.value.trim().toUpperCase();
    if (isActiveVal !== 'Y' && isActiveVal !== 'N') {
        markFieldError(isActiveField);
        setMsg('Is Active must be Y or N.', 'red', 2500);
        isActiveField.focus();
        return false;
    }

    var data = {
        id:        recordId,
        lov_type:  fieldNameField.value.trim().toUpperCase(),
        lov_value: optionField.value.trim(),
        is_active: isActiveVal
    };

    if (findMode && !hasChanged()) {
        setMsg('No changes made to update.', 'red', 2500);
        return false;
    }

    try {
        var dupUrl = '/api/check-lov-duplicate?type=' + encodeURIComponent(data.lov_type) + '&value=' + encodeURIComponent(data.lov_value);
        if (findMode) dupUrl += '&exclude_id=' + encodeURIComponent(recordId);
        var dupRes  = await fetch(dupUrl);
        var dupData = await dupRes.json();
        if (dupData.duplicate) {
            markFieldError(optionField);
            setMsg('This Display Value already exists under this Field Name!', 'red', 3000);
            optionField.focus();
            return false;
        }
    } catch (e) {}

    setMsg('Saving...', 'black');

    try {
        var res = await fetch('/api/save-lov', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        var reply = await res.json();
        if (!reply.success) throw new Error(reply.error || 'Save failed');

        setMsg('LOV record saved successfully!', 'green');
        await fetchAllLOVs();

        if (!findMode) {
            clearForm();
        } else {
            document.getElementById('save_btn').innerText = 'Update';
            saveOriginal();
            updateNextBtnState();
            setToggleActive('Find');
            document.getElementById('prev_btn').disabled = (position === 0);
        }
        return true;
    } catch (e) {
        setMsg('Something went wrong while saving. Please try again.', 'red', 2500);
        return false;
    }
}

document.getElementById('save_btn').addEventListener('click', async function() {
    await submitForm();
});

function isUpdateMode() {
    return document.getElementById('save_btn').innerText === 'Update';
}

function showUnsavedDialog(action) {
    pendingNav = action;
    document.getElementById('unsaved_modal').showModal();
}

document.getElementById('unsaved_save_btn').addEventListener('click', async function() {
    var saved = await submitForm();
    document.getElementById('unsaved_modal').close();
    if (saved && pendingNav) {
        await pendingNav();
    }
    pendingNav = null;
});

document.getElementById('unsaved_discard_btn').addEventListener('click', async function() {
    document.getElementById('unsaved_modal').close();
    if (pendingNav) {
        await pendingNav();
        pendingNav = null;
    }
});

document.getElementById('unsaved_cancel_btn').addEventListener('click', function() {
    document.getElementById('unsaved_modal').close();
    pendingNav = null;
});

async function doNext() {
    if (dropdownData.length === 0) {
        setMsg('No next record.', 'red', 2500);
        return;
    }

    if (position === -1) {
        position = 0;
    } else {
        if (position < dropdownData.length - 1) {
            position = position + 1;
        } else {
            clearForm();
            return;
        }
    }

    recordId = dropdownData[position][0];
    fillForm({
        lov_type:  dropdownData[position][1],
        lov_value: dropdownData[position][2],
        is_active: dropdownData[position][3]
    });
    findMode = true;
    setMsg('Loaded next record.', 'green');
}

async function doPrev() {
    if (dropdownData.length === 0) {
        setMsg('No previous record.', 'red', 2500);
        return;
    }

    if (position === -1) {
        position = dropdownData.length - 1;
    } else {
        if (position > 0) {
            position = position - 1;
        } else {
            setMsg('You are already on the first record.', 'red', 2500);
            return;
        }
    }

    recordId = dropdownData[position][0];
    fillForm({
        lov_type:  dropdownData[position][1],
        lov_value: dropdownData[position][2],
        is_active: dropdownData[position][3]
    });
    findMode = true;
    setMsg('Loaded previous record.', 'green');
}

document.getElementById('next_btn').addEventListener('click', async function() {
    if (document.getElementById('new_btn').classList.contains('active')) {
        setMsg('You are already on the new form mode.', 'red', 2500);
        return;
    }
    if (isUpdateMode() && hasChanged()) {
        showUnsavedDialog(doNext);
    } else {
        await doNext();
    }
});

document.getElementById('prev_btn').addEventListener('click', async function() {
    if (isUpdateMode() && hasChanged()) {
        showUnsavedDialog(doPrev);
    } else {
        await doPrev();
    }
});

document.getElementById('exit_btn').addEventListener('click', function() {
    window.location.href = 'index.html';
});

document.querySelectorAll('.info-icon').forEach(function(icon) {
    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        var helpText = this.getAttribute('data-help');
        if (helpText) showModal(helpText);
    });
});
