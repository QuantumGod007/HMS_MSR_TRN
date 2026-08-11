const express  = require('express');
const oracledb = require('oracledb');

const app = express();
app.use(express.json());

app.get('/', function(req, res) {
    res.redirect('/master-forms/index.html');
});

app.get('/appointment.html', function(req, res) {
    res.redirect('http://localhost:5001/transaction-forms/appointment.html');
});

app.get('/opd_visit.html', function(req, res) {
    res.redirect('http://localhost:5001/transaction-forms/opd_visit.html');
});

app.use(express.static('public'));

async function connectDB() {
    try {
        await oracledb.createPool({
            user: 'KHANMDMOHSIN1802_SCHEMA_W2BSC',
            password: 'REPLACE_WITH_YOUR_DATABASE_PASSWORD',
            connectString: 'tcps://db.freesql.com:2484/26ai_un3c1',
            poolMin: 3,
            poolMax: 10
        });
        console.log('DB connected');
    } catch (err) {
        console.log('DB error:', err.message);
    }
}
connectDB();

var lovCache = {};
var staticLovTypes = ['GENDER', 'BLOOD_GROUP', 'BED_TYPE', 'PAYMENT_MODE', 'APPOINTMENT_STATUS'];

app.get('/api/get-lov', async function(req, res) {
    var type = req.query.type;
    var status = req.query.status;

    var cacheKey = type + (status ? '_' + status : '');
    if (staticLovTypes.includes(type) && lovCache[cacheKey]) {
        return res.json({ success: true, list: lovCache[cacheKey] });
    }

    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql = `SELECT lov_value, lov_value FROM MST_LOV WHERE lov_type = :type AND is_active = 'Y'`;
        var result = await conn.execute(sql, { type });

        if (staticLovTypes.includes(type)) {
            lovCache[cacheKey] = result.rows;
        }

        res.json({ success: true, list: result.rows });
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.get('/api/list-patients', async function(req, res) {
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql = `SELECT uhid, first_name, last_name, mobile_no FROM MST_PATIENT ORDER BY uhid`;
        var result = await conn.execute(sql);
        res.json({ success: true, list: result.rows });
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.get('/api/list-doctors', async function(req, res) {
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql = `SELECT doctor_code, doctor_name, specialization, doctor_id FROM MST_DOCTOR WHERE status = 1 ORDER BY doctor_id`;
        var result = await conn.execute(sql);
        res.json({ success: true, list: result.rows });
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.get('/api/get-next-id', async function(req, res) {
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql = `SELECT NVL(MAX(patient_id), 0) + 1 as next_id FROM MST_PATIENT`;
        var result = await conn.execute(sql);
        res.json({ success: true, next_id: result.rows[0][0] });
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.get('/api/get-patient', async function(req, res) {
    var uhid = req.query.uhid;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql = `
            SELECT patient_id, uhid, first_name, last_name, gender, TO_CHAR(dob, 'YYYY-MM-DD') as dob, mobile_no, email, blood_group
            FROM MST_PATIENT
            WHERE UPPER(uhid) = UPPER(:uhid)
        `;
        var result = await conn.execute(sql, { uhid });

        if (result.rows.length > 0) {
            var row = result.rows[0];
            res.json({
                found: true,
                patient: {
                    patient_id: row[0],
                    uhid: row[1],
                    first_name: row[2],
                    last_name: row[3],
                    gender: row[4],
                    dob: row[5],
                    mobile_no: row[6],
                    email: row[7],
                    blood_group: row[8]
                }
            });
        } else {
            res.json({ found: false });
        }
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.get('/api/next-patient', async function(req, res) {
    var currentId = req.query.current_id;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql;
        var binds = {};

        if (!currentId || currentId === 'null' || currentId === '') {
            sql = `
                SELECT * FROM (
                    SELECT patient_id, uhid, first_name, last_name, gender, TO_CHAR(dob, 'YYYY-MM-DD') as dob, mobile_no, email, blood_group
                    FROM MST_PATIENT
                    ORDER BY patient_id ASC
                ) WHERE ROWNUM = 1
            `;
        } else {
            sql = `
                SELECT * FROM (
                    SELECT patient_id, uhid, first_name, last_name, gender, TO_CHAR(dob, 'YYYY-MM-DD') as dob, mobile_no, email, blood_group
                    FROM MST_PATIENT
                    WHERE patient_id > :currentId
                    ORDER BY patient_id ASC
                ) WHERE ROWNUM = 1
            `;
            binds.currentId = parseInt(currentId);
        }

        var result = await conn.execute(sql, binds);

        if (result.rows.length > 0) {
            var row = result.rows[0];
            res.json({
                found: true,
                patient: {
                    patient_id: row[0],
                    uhid: row[1],
                    first_name: row[2],
                    last_name: row[3],
                    gender: row[4],
                    dob: row[5],
                    mobile_no: row[6],
                    email: row[7],
                    blood_group: row[8]
                }
            });
        } else {
            res.json({ found: false });
        }
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.get('/api/prev-patient', async function(req, res) {
    var currentId = req.query.current_id;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql;
        var binds = {};

        if (!currentId || currentId === 'null' || currentId === '') {
            sql = `
                SELECT * FROM (
                    SELECT patient_id, uhid, first_name, last_name, gender, TO_CHAR(dob, 'YYYY-MM-DD') as dob, mobile_no, email, blood_group
                    FROM MST_PATIENT
                    ORDER BY patient_id DESC
                ) WHERE ROWNUM = 1
            `;
        } else {
            sql = `
                SELECT * FROM (
                    SELECT patient_id, uhid, first_name, last_name, gender, TO_CHAR(dob, 'YYYY-MM-DD') as dob, mobile_no, email, blood_group
                    FROM MST_PATIENT
                    WHERE patient_id < :currentId
                    ORDER BY patient_id DESC
                ) WHERE ROWNUM = 1
            `;
            binds.currentId = parseInt(currentId);
        }

        var result = await conn.execute(sql, binds);

        if (result.rows.length > 0) {
            var row = result.rows[0];
            res.json({
                found: true,
                patient: {
                    patient_id: row[0],
                    uhid: row[1],
                    first_name: row[2],
                    last_name: row[3],
                    gender: row[4],
                    dob: row[5],
                    mobile_no: row[6],
                    email: row[7],
                    blood_group: row[8]
                }
            });
        } else {
            res.json({ found: false });
        }
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.get('/api/check-patient-duplicate', async function(req, res) {
    var { field, value, exclude_uhid } = req.query;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql, binds = { value };
        if (field === 'uhid') {
            sql = `SELECT COUNT(*) FROM MST_PATIENT WHERE UPPER(uhid) = UPPER(:value)`;
        } else if (field === 'mobile_no') {
            if (exclude_uhid) {
                sql = `SELECT COUNT(*) FROM MST_PATIENT WHERE mobile_no = :value AND UPPER(uhid) != UPPER(:excl)`;
                binds.excl = exclude_uhid;
            } else {
                sql = `SELECT COUNT(*) FROM MST_PATIENT WHERE mobile_no = :value`;
            }
        } else if (field === 'email') {
            if (exclude_uhid) {
                sql = `SELECT COUNT(*) FROM MST_PATIENT WHERE UPPER(email) = UPPER(:value) AND UPPER(uhid) != UPPER(:excl)`;
                binds.excl = exclude_uhid;
            } else {
                sql = `SELECT COUNT(*) FROM MST_PATIENT WHERE UPPER(email) = UPPER(:value)`;
            }
        } else {
            return res.json({ duplicate: false });
        }
        var result = await conn.execute(sql, binds);
        res.json({ duplicate: result.rows[0][0] > 0 });
    } catch (err) {
        res.json({ duplicate: false, error: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

app.get('/api/check-medicine-duplicate', async function(req, res) {
    var { name, exclude_id } = req.query;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql, binds = { name };
        if (exclude_id) {
            sql = `SELECT COUNT(*) FROM MST_MEDICINE WHERE UPPER(medicine_name) = UPPER(:name) AND medicine_id != :excl`;
            binds.excl = parseInt(exclude_id);
        } else {
            sql = `SELECT COUNT(*) FROM MST_MEDICINE WHERE UPPER(medicine_name) = UPPER(:name)`;
        }
        var result = await conn.execute(sql, binds);
        res.json({ duplicate: result.rows[0][0] > 0 });
    } catch (err) {
        res.json({ duplicate: false });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

app.get('/api/check-lov-duplicate', async function(req, res) {
    var { type, value, exclude_id } = req.query;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql, binds = { type, value };
        if (exclude_id && exclude_id !== '') {
            sql = `SELECT COUNT(*) FROM MST_LOV WHERE UPPER(lov_type) = UPPER(:type) AND UPPER(lov_value) = UPPER(:value) AND lov_id != :excl`;
            binds.excl = parseInt(exclude_id);
        } else {
            sql = `SELECT COUNT(*) FROM MST_LOV WHERE UPPER(lov_type) = UPPER(:type) AND UPPER(lov_value) = UPPER(:value)`;
        }
        var result = await conn.execute(sql, binds);
        res.json({ duplicate: result.rows[0][0] > 0 });
    } catch (err) {
        res.json({ duplicate: false });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

app.post('/api/save-patient', async function(req, res) {
    var { uhid, first_name, last_name, gender, dob, mobile_no, email, blood_group } = req.body;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql = `
            INSERT INTO MST_PATIENT
            (uhid, first_name, last_name, gender, dob, mobile_no, email, blood_group, created_at)
            VALUES
            (:uhid, :first_name, :last_name, :gender, TO_DATE(:dob, 'YYYY-MM-DD'), :mobile_no, :email, :blood_group, SYSDATE)
            RETURNING patient_id INTO :patient_id
        `;
        var result = await conn.execute(sql, {
            uhid, first_name, last_name, gender, dob, mobile_no, email, blood_group,
            patient_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }, { autoCommit: true });

        var newId = result.outBinds.patient_id[0];
        res.json({ success: true, patient_id: newId });
    } catch (err) {
        if (err.message.includes('ORA-00001')) {
            res.json({ success: false, error: 'Patient already exists!' });
        } else {
            res.json({ success: false, error: err.message });
        }
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.post('/api/update-patient', async function(req, res) {
    var { uhid, first_name, last_name, gender, dob, mobile_no, email, blood_group } = req.body;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql = `
            UPDATE MST_PATIENT
            SET first_name = :first_name,
                last_name = :last_name,
                gender = :gender,
                dob = TO_DATE(:dob, 'YYYY-MM-DD'),
                mobile_no = :mobile_no,
                email = :email,
                blood_group = :blood_group
            WHERE uhid = :uhid
        `;
        await conn.execute(sql, {
            uhid, first_name, last_name, gender, dob, mobile_no, email, blood_group
        }, { autoCommit: true });

        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.get('/api/get-all-lov', async function(req, res) {
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql = `SELECT lov_id, lov_type, lov_value, is_active FROM MST_LOV ORDER BY lov_type, lov_id`;
        var result = await conn.execute(sql);
        res.json(result.rows);
    } catch (err) {
        res.json({ error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.post('/api/save-lov', async function(req, res) {
    var { id, lov_type, lov_value, is_active } = req.body;
    var conn;
    try {
        conn = await oracledb.getConnection();
        if (id === '') {
            await conn.execute(
                `INSERT INTO MST_LOV (lov_id, lov_type, lov_value, is_active) VALUES (seq_lov_id.NEXTVAL, :lov_type, :lov_value, :is_active)`,
                { lov_type, lov_value, is_active },
                { autoCommit: true }
            );
            res.json({ success: true });
        } else {
            await conn.execute(
                `UPDATE MST_LOV SET lov_type = :lov_type, lov_value = :lov_value, is_active = :is_active WHERE lov_id = :id`,
                { lov_type, lov_value, is_active, id: parseInt(id) },
                { autoCommit: true }
            );
            res.json({ success: true });
        }
        lovCache = {};
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) {}
        }
    }
});

app.get('/api/get-medicine', async function(req, res)
{
    var id = req.query.id;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var result = await conn.execute(
            `SELECT medicine_id, medicine_name, unit_price, reorder_level
             FROM MST_MEDICINE WHERE medicine_id = :id`,
            { id: parseInt(id) }
        );
        if (result.rows.length > 0) {
            var r = result.rows[0];
            res.json({ found: true, medicine: { medicine_id: r[0], medicine_name: r[1], unit_price: r[2], reorder_level: r[3] } });
        } else {
            res.json({ found: false });
        }
    } catch (err) {
        res.json({ found: false, error: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

app.get('/api/medicine-next-id', async function(req, res) {
    var conn;
    try {
        conn = await oracledb.getConnection();
        var result = await conn.execute(`SELECT NVL(MAX(medicine_id), 0) + 1 FROM MST_MEDICINE`);
        res.json({ success: true, next_id: result.rows[0][0] });
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

app.post('/api/save-medicine', async function(req, res) {
    var { medicine_name, unit_price, reorder_level } = req.body;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var result = await conn.execute(
            `INSERT INTO MST_MEDICINE (medicine_name, unit_price, reorder_level)
             VALUES (:medicine_name, :unit_price, :reorder_level)
             RETURNING medicine_id INTO :medicine_id`,
            {
                medicine_name,
                unit_price:    unit_price    || null,
                reorder_level: reorder_level || null,
                medicine_id:   { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: true }
        );
        res.json({ success: true, medicine_id: result.outBinds.medicine_id[0] });
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

app.post('/api/update-medicine', async function(req, res) {
    var { medicine_id, medicine_name, unit_price, reorder_level } = req.body;
    var conn;
    try {
        conn = await oracledb.getConnection();
        await conn.execute(
            `UPDATE MST_MEDICINE
             SET medicine_name = :medicine_name,
                 unit_price    = :unit_price,
                 reorder_level = :reorder_level
             WHERE medicine_id = :medicine_id`,
            {
                medicine_name,
                unit_price:    unit_price    || null,
                reorder_level: reorder_level || null,
                medicine_id:   parseInt(medicine_id)
            },
            { autoCommit: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, error: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

app.get('/api/medicine-next', async function(req, res) {
    var current_id = req.query.current_id;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql;
        var binds = {};
        if (!current_id || current_id === 'null' || current_id === '') {
            sql = `SELECT medicine_id, medicine_name, unit_price, reorder_level
                   FROM MST_MEDICINE
                   ORDER BY medicine_id ASC
                   FETCH FIRST 1 ROWS ONLY`;
        } else {
            sql = `SELECT medicine_id, medicine_name, unit_price, reorder_level
                   FROM MST_MEDICINE
                   WHERE medicine_id > :current_id
                   ORDER BY medicine_id ASC
                   FETCH FIRST 1 ROWS ONLY`;
            binds.current_id = parseInt(current_id);
        }
        var result = await conn.execute(sql, binds);
        if (result.rows.length > 0) {
            var r = result.rows[0];
            res.json({ found: true, medicine: { medicine_id: r[0], medicine_name: r[1], unit_price: r[2], reorder_level: r[3] } });
        } else {
            res.json({ found: false });
        }
    } catch (err) {
        res.json({ found: false, error: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

app.get('/api/medicine-prev', async function(req, res) {
    var current_id = req.query.current_id;
    var conn;
    try {
        conn = await oracledb.getConnection();
        var sql;
        var binds = {};
        if (!current_id || current_id === 'null' || current_id === '') {
            sql = `SELECT medicine_id, medicine_name, unit_price, reorder_level
                   FROM MST_MEDICINE
                   ORDER BY medicine_id DESC
                   FETCH FIRST 1 ROWS ONLY`;
        } else {
            sql = `SELECT medicine_id, medicine_name, unit_price, reorder_level
                   FROM MST_MEDICINE
                   WHERE medicine_id < :current_id
                   ORDER BY medicine_id DESC
                   FETCH FIRST 1 ROWS ONLY`;
            binds.current_id = parseInt(current_id);
        }
        var result = await conn.execute(sql, binds);
        if (result.rows.length > 0) {
            var r = result.rows[0];
            res.json({ found: true, medicine: { medicine_id: r[0], medicine_name: r[1], unit_price: r[2], reorder_level: r[3] } });
        } else {
            res.json({ found: false });
        }
    } catch (err) {
        res.json({ found: false, error: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
