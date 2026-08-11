async function loadLOV(type, selId, placeholder) {
    try {
        var res = await fetch('/api/get-lov?type=' + type);
        var data = await res.json();
        var sel = document.getElementById(selId);
        sel.innerHTML = placeholder ? '<option value="" disabled selected>' + placeholder + '</option>' : '<option value="" selected></option>';
        if (data.success && data.list.length > 0) {
            if (!placeholder) sel.innerHTML = '<option value="" selected></option>';
            data.list.forEach(function(row) {
                var opt = document.createElement('option');
                opt.value = row[0];
                opt.innerText = row[1];
                sel.appendChild(opt);
            });
        }
    } catch (e) {}
}

async function fetchNextId() {
    try {
        var res = await fetch('/api/get-next-id');
        var data = await res.json();
        if (data.success) {
            document.getElementById('patient_id').value = data.next_id;
        }
    } catch (e) {}
}

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

function setFormMsg(text, color, delayMs) {
    var box = document.getElementById('form_msg');
    if (!box) return;
    box.innerText = text;
    box.style.color = color || 'green';
    if (window.msgTimeout) clearTimeout(window.msgTimeout);
    if (delayMs) {
        window.msgTimeout = setTimeout(function() {
            box.innerText = '';
            box.style.color = 'green';
        }, delayMs);
    }
}

function markFieldError(f) {
    f.style.borderColor = '#ef4444';
    f.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
    f.addEventListener('input', function clear() {
        f.style.borderColor = '';
        f.style.boxShadow = '';
        f.removeEventListener('input', clear);
    });
    f.addEventListener('change', function clearChange() {
        f.style.borderColor = '';
        f.style.boxShadow = '';
        f.removeEventListener('change', clearChange);
    });
}

loadLOV('GENDER', 'gender', '');
loadLOV('BLOOD_GROUP', 'blood_group', '');
fetchNextId();
updateNextBtnState();
document.getElementById('prev_btn').disabled = false;

function clearPatientId() {
    document.getElementById('patient_id').value = '';
}

function showModal(msg) {
    document.getElementById('modal_text').innerText = msg;
    document.getElementById('custom_modal').showModal();
}

document.getElementById('modal_close_btn').addEventListener('click', function() {
    document.getElementById('custom_modal').close();
});

document.querySelectorAll('.info-icon').forEach(function(icon) {
    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        var helpText = this.getAttribute('data-help');
        if (helpText) showModal(helpText);
    });
});

document.getElementById('uhid').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('find_btn').click();
    }
});

var pts = [];

async function loadPts() {
    try {
        var res = await fetch('/api/list-patients');
        var data = await res.json();
        if (data.success) pts = data.list;
    } catch (e) {}
}

document.getElementById('uhid').addEventListener('focus', async function() {
    var isFindMode = document.getElementById('find_btn').classList.contains('active');
    if (isFindMode && !this.readOnly) {
        await loadPts();
        showUhidSuggestions(this.value);
    }
});

function showUhidSuggestions(inputVal) {
    var uhidEl = document.getElementById('uhid');
    if (uhidEl.readOnly) return;
    var isFindMode = document.getElementById('find_btn').classList.contains('active');
    if (!isFindMode) return;

    var val = (inputVal || '').toLowerCase().trim();
    var box = document.getElementById('uhid_suggestions');

    var matches = pts.filter(function(p) {
        if (!val) return true;
        var uhidMatch = p[0] && p[0].toLowerCase().includes(val);
        var fnMatch   = p[1] && p[1].toLowerCase().includes(val);
        var lnMatch   = p[2] && p[2].toLowerCase().includes(val);
        var mobMatch  = p[3] && p[3].includes(val);
        return uhidMatch || fnMatch || lnMatch || mobMatch;
    });

    if (matches.length === 0) {
        box.style.display = 'none';
        return;
    }

    box.innerHTML = '';
    var table = document.createElement('table');
    table.className = 'suggestion-table';

    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>UHID</th><th>Patient Name</th><th>Mobile</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    matches.slice(0, 30).forEach(function(p) {
        var tr = document.createElement('tr');
        var fullName = p[1] + (p[2] ? ' ' + p[2] : '');
        tr.innerHTML = '<td>' + p[0] + '</td><td>' + fullName + '</td><td>' + (p[3] || '') + '</td>';
        tr.addEventListener('mousedown', function(e) {
            e.preventDefault();
            document.getElementById('uhid').value = p[0];
            box.style.display = 'none';
            document.getElementById('find_btn').click();
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    box.appendChild(table);
    box.style.display = 'block';
}

document.getElementById('uhid').addEventListener('input', function() {
    showUhidSuggestions(this.value);
});

document.addEventListener('click', function(e) {
    var box = document.getElementById('uhid_suggestions');
    if (e.target.id !== 'uhid' && box) box.style.display = 'none';
});

var pending = null;

document.getElementById('unsaved_save_btn').addEventListener('click', async function() {
    var saved = await submitForm();
    document.getElementById('unsaved_modal').close();
    if (saved && pending) await pending();
    pending = null;
});

document.getElementById('unsaved_discard_btn').addEventListener('click', async function() {
    document.getElementById('unsaved_modal').close();
    if (pending) {
        await pending();
        pending = null;
    }
});

document.getElementById('unsaved_cancel_btn').addEventListener('click', function() {
    document.getElementById('unsaved_modal').close();
    pending = null;
});

function isUpdateMode() {
    var btn = document.querySelector('button[type="submit"]');
    return btn && btn.innerText === 'Update';
}

function hasUnsavedChanges() {
    if (isUpdateMode()) return hasFormChanged();
    return (
        document.getElementById('first_name').value.trim() !== '' ||
        document.getElementById('last_name').value.trim() !== '' ||
        document.getElementById('gender').value.trim() !== '' ||
        document.getElementById('dob').value.trim() !== '' ||
        document.getElementById('mobile_no').value.trim() !== '' ||
        document.getElementById('email').value.trim() !== '' ||
        document.getElementById('blood_group').value.trim() !== ''
    );
}

function clearErrors() {
    ['uhid', 'first_name', 'last_name', 'gender', 'dob', 'mobile_no', 'email', 'blood_group'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.style.borderColor = '';
            el.style.boxShadow = '';
        }
    });
}

function showUnsavedDialog(action) {
    pending = action;
    document.getElementById('unsaved_modal').showModal();
}

function switchToSearch() {
    clearErrors();
    var uhid = document.getElementById('uhid');
    setToggleActive('Find');
    clearPatientId();
    uhid.readOnly = false;
    uhid.removeAttribute('readonly');
    uhid.value = '';
    uhid.focus();
    setFormMsg('', 'green');
}

async function doSearch(uhidVal) {
    var uhid = document.getElementById('uhid');
    var btn = document.querySelector('button[type="submit"]');
    try {
        var res = await fetch('/api/get-patient?uhid=' + uhidVal);
        if (!res.ok) throw new Error('');
        var data = await res.json();
        if (data.found) {
            await fillForm(data.patient);
            setFormMsg('', 'green');
        } else {
            setFormMsg('No patient found with that UHID.', 'red', 2500);
            document.getElementById('patient_form').reset();
            clearErrors();
            uhid.value = uhidVal;
            uhid.readOnly = false;
            uhid.removeAttribute('readonly');
            btn.innerText = 'Save';
            updateNextBtnState();
            setToggleActive('New');
            document.getElementById('prev_btn').disabled = false;
            await fetchNextId();
        }
    } catch (e) {
        setFormMsg('Something went wrong. Please try again.', 'red', 2500);
        setToggleActive('New');
    }
}

document.getElementById('find_btn').addEventListener('click', async function() {
    var uhid = document.getElementById('uhid');
    var isNew = document.getElementById('new_btn').classList.contains('active');

    if (isNew) {
        var val = uhid.value.trim();
        if (val !== '') {
            if (hasUnsavedChanges()) {
                showUnsavedDialog(async function() { await doSearch(val); });
            } else {
                await doSearch(val);
            }
        } else {
            if (hasUnsavedChanges()) {
                showUnsavedDialog(switchToSearch);
            } else {
                switchToSearch();
            }
        }
        return;
    }

    if (uhid.readOnly) {
        if (hasUnsavedChanges()) {
            showUnsavedDialog(switchToSearch);
        } else {
            switchToSearch();
        }
        return;
    }

    var val = uhid.value.trim();
    if (val === '') {
        setFormMsg('Please enter a UHID to search!', 'red', 2500);
        return;
    }

    if (hasUnsavedChanges()) {
        showUnsavedDialog(async function() { await doSearch(val); });
    } else {
        await doSearch(val);
    }
});

function doNew() {
    document.getElementById('patient_form').reset();
    clearErrors();
    var uhid = document.getElementById('uhid');
    uhid.readOnly = false;
    uhid.removeAttribute('readonly');
    var box = document.getElementById('uhid_suggestions');
    if (box) box.style.display = 'none';
    document.querySelector('button[type="submit"]').innerText = 'Save';
    fetchNextId();
    updateNextBtnState();
    setToggleActive('New');
    document.getElementById('prev_btn').disabled = false;
    setFormMsg('', 'green');
    uhid.focus();
}

document.getElementById('new_btn').addEventListener('click', function() {
    if (hasUnsavedChanges()) {
        showUnsavedDialog(doNew);
    } else {
        doNew();
    }
});

var orig = {};

function saveOrig() {
    orig = {
        first_name:  document.getElementById('first_name').value,
        last_name:   document.getElementById('last_name').value,
        gender:      document.getElementById('gender').value,
        dob:         document.getElementById('dob').value,
        mobile_no:   document.getElementById('mobile_no').value,
        email:       document.getElementById('email').value,
        blood_group: document.getElementById('blood_group').value
    };
}

function hasFormChanged() {
    return (
        document.getElementById('first_name').value  !== orig.first_name  ||
        document.getElementById('last_name').value   !== orig.last_name   ||
        document.getElementById('gender').value      !== orig.gender      ||
        document.getElementById('dob').value         !== orig.dob         ||
        document.getElementById('mobile_no').value   !== orig.mobile_no   ||
        document.getElementById('email').value       !== orig.email       ||
        document.getElementById('blood_group').value !== orig.blood_group
    );
}

async function fillForm(p) {
    clearErrors();
    document.getElementById('patient_id').value  = p.patient_id  || '';
    document.getElementById('uhid').value        = p.uhid        || '';
    document.getElementById('first_name').value  = p.first_name  || '';
    document.getElementById('last_name').value   = p.last_name   || '';
    document.getElementById('gender').value      = p.gender      || '';
    document.getElementById('dob').value         = p.dob         || '';
    document.getElementById('mobile_no').value   = p.mobile_no   || '';
    document.getElementById('email').value       = p.email       || '';
    document.getElementById('blood_group').value = p.blood_group || '';

    document.querySelector('button[type="submit"]').innerText = 'Update';
    var uhid = document.getElementById('uhid');
    uhid.readOnly = true;
    uhid.setAttribute('readonly', 'readonly');
    var box = document.getElementById('uhid_suggestions');
    if (box) box.style.display = 'none';
    saveOrig();
    updateNextBtnState();
    setToggleActive('Find');

    try {
        var res = await fetch('/api/prev-patient?current_id=' + p.patient_id);
        var data = await res.json();
        document.getElementById('prev_btn').disabled = !data.found;
    } catch (e) {
        document.getElementById('prev_btn').disabled = false;
    }
}

document.getElementById('next_btn').addEventListener('click', async function() {
    if (document.getElementById('new_btn').classList.contains('active')) {
        setFormMsg('You are already on the new form mode.', 'red', 2500);
        return;
    }
    if (hasUnsavedChanges()) {
        showUnsavedDialog(doNext);
    } else {
        await doNext();
    }
});

document.getElementById('prev_btn').addEventListener('click', async function() {
    if (hasUnsavedChanges()) {
        showUnsavedDialog(doPrev);
    } else {
        await doPrev();
    }
});

async function resetToNew() {
    document.getElementById('patient_form').reset();
    clearErrors();
    document.querySelector('button[type="submit"]').innerText = 'Save';
    var uhid = document.getElementById('uhid');
    uhid.readOnly = false;
    uhid.removeAttribute('readonly');
    await fetchNextId();
    setToggleActive('New');
    document.getElementById('prev_btn').disabled = false;
    setFormMsg('', 'green');
    uhid.focus();
}

async function doNext() {
    var isNew = document.getElementById('new_btn').classList.contains('active');
    var btn = document.querySelector('button[type="submit"]');
    if (!isNew && btn.innerText === 'Save') {
        await resetToNew();
        return;
    }
    var curId = document.getElementById('patient_id').value;
    try {
        var res = await fetch('/api/next-patient?current_id=' + curId);
        if (!res.ok) throw new Error('');
        var data = await res.json();
        if (data.found) {
            await fillForm(data.patient);
        } else {
            await resetToNew();
        }
    } catch (e) {
        setFormMsg('Something went wrong. Please try again.', 'red', 2500);
    }
}

async function doPrev() {
    var curId = document.getElementById('patient_id').value;
    if (!curId || curId.trim() === '') curId = '999999';
    try {
        var res = await fetch('/api/prev-patient?current_id=' + curId);
        if (!res.ok) throw new Error('');
        var data = await res.json();
        if (data.found) {
            await fillForm(data.patient);
        } else {
            setFormMsg('You are already on the first patient.', 'red', 2500);
        }
    } catch (e) {
        setFormMsg('Something went wrong. Please try again.', 'red', 2500);
    }
}

document.getElementById('exit_btn').addEventListener('click', function() {});

async function submitForm() {
    var uhid    = document.getElementById('uhid');
    var fn      = document.getElementById('first_name');
    var ln      = document.getElementById('last_name');
    var gender  = document.getElementById('gender');
    var dob     = document.getElementById('dob');
    var mobile  = document.getElementById('mobile_no');
    var email   = document.getElementById('email');
    var btn     = document.querySelector('button[type="submit"]');

    var required = [uhid, fn, ln, gender, dob, mobile];
    var empty = [];
    required.forEach(function(f) {
        if (!f.value || f.value.trim() === '') {
            empty.push(f);
            markFieldError(f);
        }
    });

    if (empty.length > 0) {
        setFormMsg('Please fill in all required fields.', 'red', 2500);
        empty[0].focus();
        return false;
    }

    if (/\d/.test(fn.value.trim())) {
        markFieldError(fn);
        setFormMsg('Names cannot contain numbers.', 'red', 2500);
        fn.focus();
        return false;
    }

    if (/\d/.test(ln.value.trim())) {
        markFieldError(ln);
        setFormMsg('Names cannot contain numbers.', 'red', 2500);
        ln.focus();
        return false;
    }

    var emailVal = email.value.trim();
    if (emailVal !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        markFieldError(email);
        setFormMsg('Please enter a valid email address.', 'red', 2500);
        email.focus();
        return false;
    }

    if (!/^[0-9]{10}$/.test(mobile.value.trim())) {
        markFieldError(mobile);
        setFormMsg('Please enter a 10-digit mobile number.', 'red', 2500);
        mobile.focus();
        return false;
    }

    var isUpdate = (btn.innerText === 'Update');
    if (isUpdate && !hasFormChanged()) {
        setFormMsg('No changes made to update.', 'red', 2500);
        return false;
    }

    var curUhid = uhid.value.trim();
    var excl = isUpdate ? curUhid : '';

    var uhidCheckUrl  = '/api/check-patient-duplicate?field=uhid&value=' + encodeURIComponent(curUhid);
    var mobCheckUrl   = '/api/check-patient-duplicate?field=mobile_no&value=' + encodeURIComponent(mobile.value.trim()) + (excl ? '&exclude_uhid=' + encodeURIComponent(excl) : '');
    var emailCheckUrl = '/api/check-patient-duplicate?field=email&value=' + encodeURIComponent(emailVal) + (excl ? '&exclude_uhid=' + encodeURIComponent(excl) : '');

    try {
        if (!isUpdate) {
            var uhidRes = await fetch(uhidCheckUrl);
            var uhidData = await uhidRes.json();
            if (uhidData.duplicate) {
                markFieldError(uhid);
                setFormMsg('This UHID already exists. Please use a different UHID.', 'red', 3000);
                uhid.focus();
                return false;
            }
        }

        var mobRes = await fetch(mobCheckUrl);
        var mobData = await mobRes.json();
        if (mobData.duplicate) {
            markFieldError(mobile);
            setFormMsg('This mobile number is already registered with another patient.', 'red', 3000);
            mobile.focus();
            return false;
        }

        if (emailVal !== '') {
            var emailRes = await fetch(emailCheckUrl);
            var emailData = await emailRes.json();
            if (emailData.duplicate) {
                markFieldError(email);
                setFormMsg('This email is already registered with another patient.', 'red', 3000);
                email.focus();
                return false;
            }
        }

    } catch (e) {
        setFormMsg('Something went wrong checking duplicates.', 'red', 2500);
        return false;
    }

    setFormMsg('Saving...', 'black');

    var payload = {
        uhid:        curUhid,
        first_name:  fn.value.trim(),
        last_name:   ln.value.trim(),
        gender:      gender.value,
        dob:         dob.value,
        mobile_no:   mobile.value.trim(),
        email:       emailVal,
        blood_group: document.getElementById('blood_group').value
    };

    try {
        var res = await fetch(isUpdate ? '/api/update-patient' : '/api/save-patient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('');
        var result = await res.json();

        if (result.success) {
            if (isUpdate) {
                setFormMsg('Patient details saved successfully!', 'green');
                if (result.patient_id) {
                    document.getElementById('patient_id').value = result.patient_id;
                }
                btn.innerText = 'Update';
                var uhidEl = document.getElementById('uhid');
                uhidEl.readOnly = true;
                uhidEl.setAttribute('readonly', 'readonly');
                saveOrig();
                setToggleActive('Find');
                try {
                    var prevRes = await fetch('/api/prev-patient?current_id=' + document.getElementById('patient_id').value);
                    var prevData = await prevRes.json();
                    document.getElementById('prev_btn').disabled = !prevData.found;
                } catch (e) {
                    document.getElementById('prev_btn').disabled = false;
                }
            } else {
                await resetToNew();
                setFormMsg('Patient details saved successfully!', 'green');
            }
            return true;
        } else {
            setFormMsg(result.error || 'Something went wrong while saving. Please try again.', 'red', 2500);
            return false;
        }
    } catch (e) {
        setFormMsg('Something went wrong. Please try again.', 'red', 2500);
        return false;
    }
}

document.getElementById('patient_form').addEventListener('submit', async function(e) {
    e.preventDefault();
    await submitForm();
});
