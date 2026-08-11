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
                ? 'Medicine loaded. Edit and click Update.'
                : '';
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

async function fetchNextId() {
    try {
        var res = await fetch('/api/medicine-next-id');
        var data = await res.json();
        if (data.success) {
            document.getElementById('medicine_id').value = data.next_id;
        }
    } catch (e) {}
}

fetchNextId();
var meds = [];

async function loadMedicineList() {
    try {
        var res = await fetch('/api/list-medicines');
        var data = await res.json();
        if (data.success) meds = data.list;
    } catch (e) {}
}

function showMedicineSuggestions(inputVal) {
    var idEl = document.getElementById('medicine_id');
    if (idEl.readOnly) return;
    var isFindMode = document.getElementById('find_btn').classList.contains('active');
    if (!isFindMode) return;

    var val = (inputVal || '').toLowerCase().trim();
    var box = document.getElementById('medicine_suggestions');

    var matches = meds.filter(function(m) {
        if (!val) return true;
        var idMatch   = String(m[0]).includes(val);
        var nameMatch = m[1] && m[1].toLowerCase().includes(val);
        return idMatch || nameMatch;
    });

    if (matches.length === 0) {
        box.style.display = 'none';
        return;
    }

    box.innerHTML = '';
    var table = document.createElement('table');
    table.className = 'suggestion-table';

    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>ID</th><th>Medicine Name</th><th>Price</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    matches.slice(0, 30).forEach(function(m) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + m[0] + '</td><td>' + m[1] + '</td><td>₹' + (m[2] || 0) + '</td>';
        tr.addEventListener('mousedown', function(e) {
            e.preventDefault();
            document.getElementById('medicine_id').value = m[0];
            box.style.display = 'none';
            document.getElementById('find_btn').click();
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    box.appendChild(table);
    box.style.display = 'block';
}

document.getElementById('medicine_id').addEventListener('focus', async function() {
    var isFindMode = document.getElementById('find_btn').classList.contains('active');
    if (isFindMode && !this.readOnly) {
        await loadMedicineList();
        showMedicineSuggestions(this.value);
    }
});

document.getElementById('medicine_id').addEventListener('input', function() {
    showMedicineSuggestions(this.value);
});

document.addEventListener('click', function(e) {
    var box = document.getElementById('medicine_suggestions');
    if (e.target.id !== 'medicine_id' && box) box.style.display = 'none';
});

updateNextBtnState();
document.getElementById('prev_btn').disabled = false;

document.getElementById('find_btn').addEventListener('click', async function() {
    var idField = document.getElementById('medicine_id');
    setToggleActive('Find');
    updateNextBtnState();

    if (idField.readOnly) {
        idField.readOnly = false;
        idField.style.backgroundColor = 'white';
        idField.value = '';
        idField.focus();
        setMsg('Enter a Medicine ID to search.', 'green');
        return;
    }

    var idVal = idField.value.trim();
    if (idVal === '' || isNaN(idVal)) {
        setMsg('Please enter a valid Medicine ID!', 'red', 2500);
        return;
    }

    try {
        var res = await fetch('/api/get-medicine?id=' + idVal);
        if (!res.ok) throw new Error();
        var result = await res.json();

        if (result.found) {
            await fillForm(result.medicine);
            idField.readOnly = true;
            idField.style.backgroundColor = '';
            setMsg('Medicine loaded. Edit and click Update.', 'green');
        } else {
            setMsg("We couldn't find any medicine with that ID.", 'red', 2500);
            idField.readOnly = true;
            idField.style.backgroundColor = '';
            await fetchNextId();
            setToggleActive('New');
            document.getElementById('prev_btn').disabled = false;
        }
    } catch (err) {
        setMsg('Something went wrong. Please check your connection and try again.', 'red', 2500);
        idField.readOnly = true;
        idField.style.backgroundColor = '';
        setToggleActive('New');
    }
});

document.getElementById('new_btn').addEventListener('click', async function() {
    var idField = document.getElementById('medicine_id');
    idField.readOnly = true;
    idField.style.backgroundColor = '';
    document.getElementById('medicine_name').value = '';
    document.getElementById('unit_price').value = '';
    document.getElementById('reorder_level').value = '';
    document.getElementById('save_btn').innerText = 'Save';
    await fetchNextId();
    setToggleActive('New');
    document.getElementById('prev_btn').disabled = false;
    setMsg('', 'green');
    document.getElementById('medicine_name').focus();
});

document.getElementById('medicine_id').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('find_btn').click();
    }
});

function saveOriginal() {
    original = {
        medicine_name: document.getElementById('medicine_name').value,
        unit_price:    document.getElementById('unit_price').value,
        reorder_level: document.getElementById('reorder_level').value
    };
}

function hasChanged() {
    return (
        document.getElementById('medicine_name').value !== original.medicine_name ||
        document.getElementById('unit_price').value    !== original.unit_price    ||
        document.getElementById('reorder_level').value !== original.reorder_level
    );
}

async function fillForm(row) {
    document.getElementById('medicine_id').value    = row.medicine_id    || '';
    document.getElementById('medicine_name').value  = row.medicine_name  || '';
    document.getElementById('unit_price').value     = row.unit_price     || '';
    document.getElementById('reorder_level').value  = row.reorder_level  || '';
    document.getElementById('save_btn').innerText   = 'Update';
    saveOriginal();
    updateNextBtnState();
    setToggleActive('Find');

    try {
        var res = await fetch('/api/medicine-prev?current_id=' + row.medicine_id);
        var result = await res.json();
        document.getElementById('prev_btn').disabled = !result.found;
    } catch (e) {
        document.getElementById('prev_btn').disabled = false;
    }
}

async function submitForm() {
    var nameField = document.getElementById('medicine_name');
    var nameVal   = nameField.value.trim();

    if (nameVal === '') {
        markFieldError(nameField);
        setMsg('Please fill in the medicine name.', 'red', 2500);
        nameField.focus();
        return false;
    }

    var priceField = document.getElementById('unit_price');
    var priceVal   = priceField.value.trim();

    if (priceVal === '') {
        markFieldError(priceField);
        setMsg('Please enter a price for the medicine.', 'red', 2500);
        priceField.focus();
        return false;
    }
    if (isNaN(priceVal) || parseFloat(priceVal) < 0) {
        markFieldError(priceField);
        setMsg('Please enter a valid price (positive number).', 'red', 2500);
        priceField.focus();
        return false;
    }

    var reorderField = document.getElementById('reorder_level');
    var reorderVal   = reorderField.value.trim();
    if (reorderVal !== '' && (isNaN(reorderVal) || parseInt(reorderVal) < 0)) {
        markFieldError(reorderField);
        setMsg('Please enter a valid whole number for the reorder level.', 'red', 2500);
        reorderField.focus();
        return false;
    }

    var medicine_id   = document.getElementById('medicine_id').value;
    var medicine_name = nameVal;
    var unit_price    = priceVal === '' ? null : parseFloat(priceVal);
    var reorder_level = reorderVal === '' ? null : parseInt(reorderVal);

    var btn      = document.getElementById('save_btn');
    var isUpdate = (btn.innerText === 'Update');
    var url      = isUpdate ? '/api/update-medicine' : '/api/save-medicine';

    if (isUpdate && !hasChanged()) {
        setMsg('No changes made to update.', 'red', 2500);
        return false;
    }

    try {
        var dupUrl = '/api/check-medicine-duplicate?name=' + encodeURIComponent(medicine_name);
        if (isUpdate) dupUrl += '&exclude_id=' + encodeURIComponent(medicine_id);
        var dupRes  = await fetch(dupUrl);
        var dupData = await dupRes.json();
        if (dupData.duplicate) {
            markFieldError(nameField);
            setMsg('Medicine name already exists!', 'red', 2500);
            nameField.focus();
            return false;
        }
    } catch (e) {}

    setMsg('Saving...', 'black');

    try {
        var res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medicine_id, medicine_name, unit_price, reorder_level })
        });

        if (!res.ok) throw new Error('Server error');
        var result = await res.json();

        if (result.success) {
            if (isUpdate) {
                setMsg('Medicine details saved successfully!', 'green');
                if (result.medicine_id) {
                    document.getElementById('medicine_id').value = result.medicine_id;
                }
                btn.innerText = 'Update';
                saveOriginal();
                setToggleActive('Find');
                try {
                    var prevRes    = await fetch('/api/medicine-prev?current_id=' + document.getElementById('medicine_id').value);
                    var prevResult = await prevRes.json();
                    document.getElementById('prev_btn').disabled = !prevResult.found;
                } catch (e) {
                    document.getElementById('prev_btn').disabled = false;
                }
            } else {
                document.getElementById('medicine_name').value = '';
                document.getElementById('unit_price').value    = '';
                document.getElementById('reorder_level').value = '';
                btn.innerText = 'Save';
                await fetchNextId();
                setToggleActive('New');
                document.getElementById('prev_btn').disabled = false;
                setMsg('Medicine details saved successfully!', 'green');
                document.getElementById('medicine_name').focus();
            }
            return true;
        } else {
            setMsg(result.error || 'Something went wrong while saving. Please try again.', 'red', 2500);
            return false;
        }
    } catch (err) {
        setMsg('Something went wrong. Please check your connection and try again.', 'red', 2500);
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

function resetToNewMode() {
    var idField = document.getElementById('medicine_id');
    idField.readOnly = true;
    idField.style.backgroundColor = '';
    document.getElementById('medicine_name').value = '';
    document.getElementById('unit_price').value    = '';
    document.getElementById('reorder_level').value = '';
    document.getElementById('save_btn').innerText  = 'Save';
    document.getElementById('prev_btn').disabled   = false;
    setMsg('', 'green');
    document.getElementById('medicine_name').focus();
}

async function doNext() {
    var isNew      = document.getElementById('new_btn').classList.contains('active');
    var isSaveMode = (document.getElementById('save_btn').innerText === 'Save');

    if (!isNew && isSaveMode) {
        await fetchNextId();
        setToggleActive('New');
        resetToNewMode();
        return;
    }

    var currentId = document.getElementById('medicine_id').value;
    try {
        var res = await fetch('/api/medicine-next?current_id=' + currentId);
        if (!res.ok) throw new Error();
        var result = await res.json();
        if (result.found) {
            await fillForm(result.medicine);
        } else {
            await fetchNextId();
            setToggleActive('New');
            resetToNewMode();
        }
    } catch (err) {
        setMsg('Something went wrong. Please check your connection and try again.', 'red', 2500);
    }
}

async function doPrev() {
    var currentId = document.getElementById('medicine_id').value;
    if (!currentId || currentId.trim() === '') currentId = '999999';

    try {
        var res = await fetch('/api/medicine-prev?current_id=' + currentId);
        if (!res.ok) throw new Error();
        var result = await res.json();
        if (result.found) {
            await fillForm(result.medicine);
        } else {
            setMsg('You are already on the first medicine.', 'red', 2500);
        }
    } catch (err) {
        setMsg('Something went wrong. Please check your connection and try again.', 'red', 2500);
    }
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

document.getElementById('exit_btn').addEventListener('click', function() {});

document.querySelectorAll('.info-icon').forEach(function(icon) {
    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        var helpText = this.getAttribute('data-help');
        if (helpText) showModal(helpText);
    });
});
