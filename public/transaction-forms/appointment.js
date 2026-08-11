var original = {};
var pendingNav = null;
var changedByUser = false;




function updateNextBtnState() 
{

    var isNew = document.getElementById('new_btn').classList.contains('active');
    document.getElementById('next_btn').disabled = isNew;
}

function setToggleActive(mode) 
{
    var findBtn = document.getElementById('find_btn');
    var newBtn  = document.getElementById('new_btn');

    if (mode === 'Find') {
        findBtn.classList.add('active');
        newBtn.classList.remove('active');

    } 
    else {
        newBtn.classList.add('active');
        findBtn.classList.remove('active');
    }
    updateNextBtnState();
}

function showModal(msg) 
{
    document.getElementById('modal_text').innerText = msg;
    document.getElementById('custom_modal').showModal();
}

document.getElementById('modal_close_btn').addEventListener('click', function() 
{
    document.getElementById('custom_modal').close();
});

function setMsg(text, color, clearAfterMs) 
{
    var box = document.getElementById('form_msg');
    box.innerText = text;
    box.style.color = color || 'green';

    if (window.msgTimer) clearTimeout(window.msgTimer);

    if (clearAfterMs) {
        window.msgTimer = setTimeout(function() {
            box.innerText = '';
        }, clearAfterMs);
    }
}

function markFieldError(f) 
{
    f.style.borderColor = '#ef4444';
    f.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
    f.addEventListener('change', function clear() {
        f.style.borderColor = '';
        f.style.boxShadow = '';
        f.removeEventListener('change', clear);
    });
    f.addEventListener('input', function clearInput() {
        f.style.borderColor = '';
        f.style.boxShadow = '';
        f.removeEventListener('input', clearInput);
    });
}

function clearErrors() {
    ['patient_search', 'doctor_search', 'appt_date', 'appt_time', 'status'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
    });
}

function getTodayStr() {
    var now = new Date();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + mm + '-' + dd;
}

function setIdReadonly(val) {
    var idField = document.getElementById('appointment_id');
    idField.readOnly = val;
    idField.style.backgroundColor = val ? '' : 'white';
    idField.style.color = val ? '' : '#1f2937';
}

async function fetchNextId() {
    try {
        var res  = await fetch('/appointment/next-id');
        var data = await res.json();
        if (data.success) {
            document.getElementById('appointment_id').value = data.next_id;
        }
    } catch (e) {}
}

var pts = [];

async function loadPatientsForAppt() {
    try {
        var res = await fetch('/api/list-patients');
        var data = await res.json();
        if (data.success) pts = data.list;
    } catch (e) {}
}

function showPatientSuggestions(inputVal) {
    var val = (inputVal || '').toLowerCase().trim();
    var box = document.getElementById('patient_suggestions');

    var matches = pts.filter(function(p) {
        if (!val) return true;
        var uhidMatch = p[0] && p[0].toLowerCase().includes(val);
        var fnMatch   = p[1] && p[1].toLowerCase().includes(val);
        var lnMatch   = p[2] && p[2].toLowerCase().includes(val);
        var mobMatch  = p[3] && String(p[3]).includes(val);
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
            document.getElementById('patient_sel').value    = String(p[4]);
            document.getElementById('patient_search').value = p[0] + ' - ' + fullName;
            changedByUser = true;
            box.style.display = 'none';
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    box.appendChild(table);
    box.style.display = 'block';
}

document.getElementById('patient_search').addEventListener('focus', async function() {
    if (pts.length === 0) await loadPatientsForAppt();
    showPatientSuggestions(this.value);
});

document.getElementById('patient_search').addEventListener('input', function() {
    document.getElementById('patient_sel').value = '';
    showPatientSuggestions(this.value);
});

document.addEventListener('click', function(e) {
    var box = document.getElementById('patient_suggestions');
    if (e.target.id !== 'patient_search' && box) box.style.display = 'none';
});

var docs = [];

async function loadDoctorsForAppt() {
    try {
        var res = await fetch('/api/list-doctors');
        var data = await res.json();
        if (data.success) docs = data.list;
    } catch (e) {}
}

function showDoctorSuggestions(inputVal) {
    var val = (inputVal || '').toLowerCase().trim();
    var box = document.getElementById('doctor_suggestions');

    var matches = docs.filter(function(d) {
        if (!val) return true;
        var codeMatch = d[0] && d[0].toLowerCase().includes(val);
        var nameMatch = d[1] && d[1].toLowerCase().includes(val);
        var specMatch = d[2] && d[2].toLowerCase().includes(val);
        return codeMatch || nameMatch || specMatch;
    });

    if (matches.length === 0) {
        box.style.display = 'none';
        return;
    }

    box.innerHTML = '';
    var table = document.createElement('table');
    table.className = 'suggestion-table';

    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Code</th><th>Doctor Name</th><th>Specialization</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    matches.slice(0, 30).forEach(function(d) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (d[0] || '') + '</td><td>' + d[1] + '</td><td>' + (d[2] || '') + '</td>';
        tr.addEventListener('mousedown', function(e) {
            e.preventDefault();
            document.getElementById('doctor_sel').value    = String(d[3]);
            document.getElementById('doctor_search').value = d[1];
            changedByUser = true;
            box.style.display = 'none';
            var dateVal = document.getElementById('appt_date').value;
            if (dateVal) checkBookedSlots(d[3], dateVal);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    box.appendChild(table);
    box.style.display = 'block';
}

document.getElementById('doctor_search').addEventListener('focus', async function() {
    if (docs.length === 0) await loadDoctorsForAppt();
    showDoctorSuggestions(this.value);
});

document.getElementById('doctor_search').addEventListener('input', function() {
    document.getElementById('doctor_sel').value = '';
    showDoctorSuggestions(this.value);
});

document.addEventListener('click', function(e) {
    var box = document.getElementById('doctor_suggestions');
    if (e.target.id !== 'doctor_search' && box) box.style.display = 'none';
});

async function loadTimeSlots() {
    var sel = document.getElementById('appt_time');
    sel.innerHTML = '<option value="" selected></option>';
    try {
        var res  = await fetch('/api/get-lov?type=APPOINTMENT_SLOTS');
        var data = await res.json();
        if (data.success && data.list && data.list.length > 0) {
            data.list.forEach(function(row) {
                var opt = document.createElement('option');
                opt.value     = row[0];
                opt.innerText = row[0];
                sel.appendChild(opt);
            });
        } else {
            var fallback = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
            fallback.forEach(function(s) {
                var opt = document.createElement('option');
                opt.value     = s;
                opt.innerText = s;
                sel.appendChild(opt);
            });
        }
    } catch (e) {}
}

async function loadStatusList() {
    try {
        var res  = await fetch('/api/get-lov?type=APPOINTMENT_STATUS');
        var data = await res.json();
        var sel  = document.getElementById('status');
        sel.innerHTML = '<option value="" selected></option>';
        if (data.success && data.list) {
            data.list.forEach(function(row) {
                var opt = document.createElement('option');
                opt.value     = row[0];
                opt.innerText = row[0];
                sel.appendChild(opt);
            });
        }
    } catch (e) {}
}

document.getElementById('doctor_sel').addEventListener('change', function() {
    var date = document.getElementById('appt_date').value;
    if (date) checkBookedSlots(this.value, date);
});

document.getElementById('appt_date').addEventListener('change', function() {
    var doctorId = document.getElementById('doctor_sel').value;
    if (doctorId) checkBookedSlots(doctorId, this.value);
});

async function checkBookedSlots(doctorId, date) {
    if (!doctorId || !date) return;
    try {
        var url = '/appointment/booked-slots?doctor_id=' + doctorId + '&date=' + date;
        if (isUpdateMode()) {
            var activeId = document.getElementById('appointment_id').value;
            if (activeId) url += '&exclude_id=' + activeId;
        }
        var res  = await fetch(url);
        var data = await res.json();
        var sel  = document.getElementById('appt_time');
        
        var bookedSet = new Set(data.success && data.booked_slots ? data.booked_slots : []);

        for (var i = 0; i < sel.options.length; i++) {
            var opt = sel.options[i];
            if (!opt.value) continue;

            if (bookedSet.has(opt.value)) {
                opt.disabled  = true;
                opt.innerText = opt.value + ' (Booked)';
                opt.style.color = '#9ca3af';
                opt.style.backgroundColor = '#f3f4f6';
            } else {
                opt.disabled  = false;
                opt.innerText = opt.value;
                opt.style.color = '#1f2937';
                opt.style.backgroundColor = 'white';
            }
        }
    } catch (e) {}
}

function saveOriginal() {
    original = {
        patient_sel: document.getElementById('patient_sel').value,
        doctor_sel:  document.getElementById('doctor_sel').value,
        appt_date:   document.getElementById('appt_date').value,
        appt_time:   document.getElementById('appt_time').value,
        status:      document.getElementById('status').value
    };
    changedByUser = false;
}

function hasChanged() {
    if (!changedByUser) return false;

    return (
        document.getElementById('patient_sel').value !== original.patient_sel ||
        document.getElementById('doctor_sel').value  !== original.doctor_sel  ||
        document.getElementById('appt_date').value   !== original.appt_date   ||
        document.getElementById('appt_time').value   !== original.appt_time   ||
        document.getElementById('status').value      !== original.status
    );
}

['patient_search', 'doctor_search', 'appt_date', 'appt_time', 'status'].forEach(function(id) {
    var field = document.getElementById(id);
    field.addEventListener('input', function() { changedByUser = true; });
    field.addEventListener('change', function() { changedByUser = true; });
});

function isUpdateMode() {
    return document.getElementById('save_btn').innerText === 'Update';
}

function setAppointmentViewOnly(value) {
    document.getElementById('appointment_form').classList.toggle('view-only', value);
    ['patient_search', 'doctor_search', 'appt_date', 'appt_time', 'status'].forEach(function(id) {
        document.getElementById(id).disabled = value;
    });
    document.getElementById('save_btn').disabled = value;
}

async function fillForm(appt) {
    clearErrors();
    setAppointmentViewOnly(false);

    document.getElementById('appointment_id').value = appt.appointment_id;
    document.getElementById('patient_sel').value    = String(appt.patient_id);

    if (pts.length === 0) await loadPatientsForAppt();
    var foundPt = pts.find(function(p) { return String(p[4]) === String(appt.patient_id); });
    if (foundPt) {
        var fullName = foundPt[1] + (foundPt[2] ? ' ' + foundPt[2] : '');
        document.getElementById('patient_search').value = foundPt[0] + ' - ' + fullName;
    } else {
        document.getElementById('patient_search').value = 'Patient ' + appt.patient_id;
    }
    document.getElementById('doctor_sel').value = String(appt.doctor_id);
    if (docs.length === 0) await loadDoctorsForAppt();
    var foundDoc = docs.find(function(d) { return String(d[3]) === String(appt.doctor_id); });
    if (foundDoc) {
        document.getElementById('doctor_search').value = foundDoc[1];
    } else {
        document.getElementById('doctor_search').value = 'Doctor ' + appt.doctor_id;
    }

    if (appt.appointment_datetime) {
        var parts = appt.appointment_datetime.split(' ');
        document.getElementById('appt_date').value = parts[0] || '';
        document.getElementById('appt_time').value = parts[1] || '';
        await checkBookedSlots(appt.doctor_id, parts[0]);
    }

    document.getElementById('status').value = appt.status || 'Booked';

    var statusSel = document.getElementById('status');
    if (appt.status === 'Completed') {
        setAppointmentViewOnly(true);
        setMsg('Appointment completed. View only.', '#b45309', 4000);
    } else {
        for (var j = 0; j < statusSel.options.length; j++) {
            if (statusSel.options[j].value === 'Completed') {
                statusSel.options[j].disabled = true;
            }
        }
    }

    document.getElementById('appt_date').removeAttribute('min');
    document.getElementById('save_btn').innerText = 'Update';

    setIdReadonly(true);
    saveOriginal();
    updateNextBtnState();
    setToggleActive('Find');

    try {
        var res  = await fetch('/appointment/previous/' + appt.appointment_id);
        var data = await res.json();
        document.getElementById('prev_btn').disabled = !data.found;
    } catch (e) {
        document.getElementById('prev_btn').disabled = false;
    }
}

async function resetToNew() {
    clearErrors();
    setAppointmentViewOnly(false);

    document.getElementById('patient_sel').value    = '';
    document.getElementById('patient_search').value = '';
    document.getElementById('doctor_sel').value     = '';
    document.getElementById('doctor_search').value  = '';
    document.getElementById('appt_date').value    = '';
    document.getElementById('appt_time').value    = '';
    document.getElementById('save_btn').innerText = 'Save';

    document.getElementById('appt_date').min   = getTodayStr();
    document.getElementById('appt_date').value = getTodayStr();

    setIdReadonly(true);
    setToggleActive('New');
    document.getElementById('prev_btn').disabled = false;
    setMsg('', 'green');

    var statusSel = document.getElementById('status');
    for (var i = 0; i < statusSel.options.length; i++) {
        statusSel.options[i].disabled = false;
        if (statusSel.options[i].value === 'Booked') {
            statusSel.selectedIndex = i;
        }
        if (statusSel.options[i].value === 'Completed') {
            statusSel.options[i].disabled = true;
        }
    }

    var timeSel = document.getElementById('appt_time');
    for (var i = 0; i < timeSel.options.length; i++) {
        if (!timeSel.options[i].value) continue;
        timeSel.options[i].disabled  = false;
        timeSel.options[i].innerText = timeSel.options[i].value;
    }

    await fetchNextId();
}

(async function() {
    await loadPatientsForAppt();
    await loadDoctorsForAppt();
    await loadStatusList();
    loadTimeSlots();
    await resetToNew();
})();

document.getElementById('appointment_form').addEventListener('submit', function(e) {
    e.preventDefault();
});

document.getElementById('find_btn').addEventListener('click', async function() {
    var idField = document.getElementById('appointment_id');
    setToggleActive('Find');

    if (idField.readOnly) {
        idField.value = '';
        setIdReadonly(false);
        idField.focus();
        setMsg('Enter an Appointment ID to search.', 'green');
        return;
    }

    var idVal = idField.value.trim();
    if (idVal === '' || isNaN(idVal)) {
        setMsg('Please enter a valid Appointment ID!', 'red', 2500);
        return;
    }

    try {
        var res    = await fetch('/appointment/' + idVal);
        var result = await res.json();
        if (result.found) {
            await fillForm(result.appointment);
        } else {
            setMsg('No appointment found with that ID.', 'red', 2500);
            await resetToNew();
        }
    } catch (e) {
        setMsg('Error fetching appointment.', 'red', 2500);
    }
});

document.getElementById('appointment_id').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('find_btn').click();
    }
});

document.getElementById('new_btn').addEventListener('click', async function() {
    if (isUpdateMode() && hasChanged()) {
        showUnsavedDialog(resetToNew);
    } else {
        await resetToNew();
    }
});

document.getElementById('save_btn').addEventListener('click', async function() {
    await submitForm();
});

async function submitForm() {
    var patSel     = document.getElementById('patient_sel');
    var patSearch  = document.getElementById('patient_search');
    var docSel     = document.getElementById('doctor_sel');
    var docSearch  = document.getElementById('doctor_search');
    var dateField  = document.getElementById('appt_date');
    var timeField  = document.getElementById('appt_time');
    var statusSel  = document.getElementById('status');

    var emptyFields = [];
    [patSearch, docSearch, dateField, timeField, statusSel].forEach(function(f) {
        if (!f.value || f.value.trim() === '') {
            emptyFields.push(f);
            markFieldError(f);
        }
    });

    if (emptyFields.length > 0) {
        setMsg('Please fill in all required fields.', 'red', 2500);
        emptyFields[0].focus();
        return false;
    }

    if (!patSel.value || patSel.value.trim() === '') {
        markFieldError(patSearch);
        setMsg('Please select a patient from the suggestion list.', 'red', 2500);
        patSearch.focus();
        return false;
    }

    if (!docSel.value || docSel.value.trim() === '') {
        markFieldError(docSearch);
        setMsg('Please select a doctor from the suggestion list.', 'red', 2500);
        docSearch.focus();
        return false;
    }

    var isUpdate = isUpdateMode();
    if (isUpdate && !hasChanged()) {
        setMsg('No changes made to update.', 'red', 2500);
        return false;
    }

    var payload = {
        appointment_id:       parseInt(document.getElementById('appointment_id').value),
        patient_id:           parseInt(patSel.value),
        doctor_id:            parseInt(docSel.value),
        appointment_datetime: dateField.value + ' ' + timeField.value,
        status:               statusSel.value
    };

    var url    = isUpdate ? '/appointment/' + payload.appointment_id : '/appointment';
    var method = isUpdate ? 'PUT' : 'POST';

    try {
        var res   = await fetch(url, {
            method:  method,
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        var reply = await res.json();

        if (reply.success) {
            setMsg('Appointment saved successfully!', 'green');
            if (!isUpdate) {
                await resetToNew();
            } else {
                saveOriginal();
            }
            return true;
        } else {
            setMsg(reply.error || 'Failed to save appointment.', 'red', 2500);
            return false;
        }
    } catch (e) {
        setMsg('Server error while saving.', 'red', 2500);
        return false;
    }
}

function showUnsavedDialog(action) {
    pendingNav = action;
    document.getElementById('unsaved_modal').showModal();
}

document.getElementById('unsaved_save_btn').addEventListener('click', async function() {
    var saved = await submitForm();
    document.getElementById('unsaved_modal').close();
    if (saved && pendingNav) await pendingNav();
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
    var currentId = document.getElementById('appointment_id').value;
    try {
        var res  = await fetch('/appointment/next/' + currentId);
        var data = await res.json();
        if (data.found) {
            await fillForm(data.appointment);
        } else {
            await resetToNew();
            setMsg('Reached end of records. Switched to New mode.', 'green', 2500);
        }
    } catch (e) {}
}

async function doPrev() {
    var currentId = document.getElementById('appointment_id').value;
    try {
        var res  = await fetch('/appointment/previous/' + currentId);
        var data = await res.json();
        if (data.found) {
            await fillForm(data.appointment);
        } else {
            setMsg('You are already on the first record.', 'red', 2500);
        }
    } catch (e) {}
}

document.getElementById('next_btn').addEventListener('click', async function() {
    if (document.getElementById('new_btn').classList.contains('active')) {
        setMsg('You are already in new form mode.', 'red', 2500);
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
    window.location.href = '/master-forms/index.html';
});

document.querySelectorAll('.info-icon').forEach(function(icon) {
    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        var helpText = this.getAttribute('data-help');
        if (helpText) showModal(helpText);
    });
});
