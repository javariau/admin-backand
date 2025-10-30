import express from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import { tableMapping, mapRequestBody, mapResponseBody } from './schema.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load .env when available (local development)
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ====== KONFIGURASI SUPABASE ======
// Prefer environment variables for credentials. See .env.example
const supabaseUrl = process.env.SUPABASE_URL ;
const supabaseKey = process.env.SUPABASE_KEY ;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn('⚠️ Warning: SUPABASE_URL or SUPABASE_KEY not found in environment. Please create a local .env (not committed) with SUPABASE_URL and SUPABASE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Connected to Supabase (using env vars if provided)");

// ====== HOME (untuk http://localhost:3000) ======
app.get("/", (req, res) => {
  res.send(`  
    <h1 style="font-family: sans-serif; text-align:center; margin-top:50px;">
      🚀 <b>EduCMS Server Berjalan!</b><br><br>
      <a href="/health" style="color:#007bff; text-decoration:none;">Cek Health</a> |
      <a href="/api/kelas" style="color:#28a745; text-decoration:none;">Lihat Data Kelas</a>
    </h1>
  `);
});


// ====== CRUD GENERIK ======

// Schema discovery endpoint
app.get("/api/schema", async (req, res) => {
  try {
    const allTables = ['categories', 'chat_rooms', 'materi', 'messages', 'notifications', 
                       'options', 'profiles', 'questions', 'quiz_attempts', 'quizzes', 
                       'rewards', 'user_favorites'];
                       
    const results = {};
    
    for (const table of allTables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      results[table] = {
        exists: !error,
        columns: data && data[0] ? Object.keys(data[0]) : []
      };
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Schema discovery error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET semua data
app.get("/api/:table", async (req, res) => {
  try {
    const { table } = req.params;
    const actualTable = tableMapping[table] || table;
    
    const { data, error } = await supabase.from(actualTable).select("*");
    
    if (error) throw error;
    
    // Map response back to legacy field names if needed
    const mappedData = mapResponseBody(table, data);
    
    res.json({ success: true, data: mappedData });
  } catch (error) {
    console.error(`❌ GET ${req.params.table} error:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET by ID
app.get("/api/:table/:id", async (req, res) => {
  try {
    const { table, id } = req.params;
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error(`❌ GET ${req.params.table} by ID error:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE
app.post("/api/:table", async (req, res) => {
  try {
    const { table } = req.params;
    const actualTable = tableMapping[table] || table;
    let body = req.body;

    console.log(`➕ CREATE ${actualTable}:`, body);

    if (!body || Object.keys(body).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Request body kosong" });
    }

    // Map request body fields to actual column names
    body = mapRequestBody(table, body);

    // Handle special cases
    if (actualTable === 'profiles' && !body.id) {
      body.id = crypto.randomUUID(); // Auto-generate UUID for profiles
    }

    // Handle foreign key relationships
    if (body.category_id) body.category_id = parseInt(body.category_id);
    if (body.room_id) body.room_id = parseInt(body.room_id);
    if (body.quiz_id) body.quiz_id = parseInt(body.quiz_id);
    if (body.question_id) body.question_id = parseInt(body.question_id);

    const { data, error } = await supabase
      .from(actualTable)
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    // Map response back to legacy field names
    const mappedData = mapResponseBody(table, data);

    res.json({ success: true, data: mappedData, message: "Data berhasil ditambahkan" });
  } catch (error) {
    console.error(`❌ CREATE ${req.params.table} error:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE
app.put("/api/:table/:id", async (req, res) => {
  try {
    const { table, id } = req.params;
    const actualTable = tableMapping[table] || table;
    let body = req.body;

    console.log(`✏️ UPDATE ${actualTable} ID ${id}:`, body);

    // Map request body fields to actual column names
    body = mapRequestBody(table, body);

    // Handle foreign key relationships
    if (body.category_id) body.category_id = parseInt(body.category_id);
    if (body.room_id) body.room_id = parseInt(body.room_id);
    if (body.quiz_id) body.quiz_id = parseInt(body.quiz_id);
    if (body.question_id) body.question_id = parseInt(body.question_id);

    const { data, error } = await supabase
      .from(actualTable)
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Map response back to legacy field names
    const mappedData = mapResponseBody(table, data);

    res.json({ success: true, data: mappedData, message: "Data berhasil diupdate" });
  } catch (error) {
    console.error(`❌ UPDATE ${req.params.table} error:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE
app.delete("/api/:table/:id", async (req, res) => {
  try {
    const { table, id } = req.params;
    const actualTable = tableMapping[table] || table;

    console.log(`🗑️ DELETE ${actualTable} ID ${id}`);

    const { error } = await supabase.from(actualTable).delete().eq("id", id);
    if (error) throw error;

    res.json({ success: true, message: "Data berhasil dihapus" });
  } catch (error) {
    console.error(`❌ DELETE ${req.params.table} error:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== DASHBOARD STATS ======
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const [categories, profiles, materi, quizzes, messages, quiz_attempts] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("materi").select("*"),
      supabase.from("quizzes").select("*"),
      supabase.from("messages").select("*"),
      supabase.from("quiz_attempts").select("*"),
    ]);

    const stats = {
      kelas: categories.data?.length || 0,
      pengguna: profiles.data?.length || 0,
      materi: materi.data?.length || 0,
      kuis: quizzes.data?.length || 0,
      forum: messages.data?.length || 0,
      pengumpulan: quiz_attempts.data?.length || 0
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("❌ Dashboard Stats Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== HEALTH CHECK ======
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server EduCMS berjalan dengan baik",
    timestamp: new Date().toISOString(),
  });
});

// ====== 404 HANDLER ======
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
});
