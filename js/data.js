// /js/data.js
import { supabase, getUser } from './supabase.js';

const LOCAL_KEY = 'ff_books_v1';
let mode = 'guest'; // 'guest' | 'user'
let userId = null;

export async function initData(){
  const user = await getUser();
  if(user){ mode='user'; userId=user.id; }
  else { mode='guest'; userId=null; }
}

export function currentMode(){ return mode; }

// ---------- Load ----------
export async function loadBooks(){
  if(mode==='guest'){
    try{ return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }catch(_){ return []; }
  } else {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('author', { ascending:true })
      .order('title', { ascending:true });
    if(error) throw error;
    return data.map(row => ({
      id: row.id, title: row.title, author: row.author, type: row.type,
      rating: row.rating, dateRead: row.date_read, cover: row.cover,
      note: row.note, facing: row.facing
    }));
  }
}

// ---------- Save helpers ----------
function saveLocal(list){ localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); }

// ---------- Add ----------
export async function addBook(book){
  if(mode==='guest'){
    const list = await loadBooks(); list.push(book); saveLocal(list); return book;
  } else {
    const payload = {
      user_id: userId,
      title: book.title, author: book.author, type: book.type,
      rating: book.rating, date_read: book.dateRead || null, cover: book.cover,
      note: book.note, facing: book.facing
    };
    const { data, error } = await supabase.from('books').insert(payload).select().single();
    if(error) throw error;
    return {
      id: data.id, title: data.title, author: data.author, type: data.type,
      rating: data.rating, dateRead: data.date_read, cover: data.cover,
      note: data.note, facing: data.facing
    };
  }
}

// ---------- Update ----------
export async function updateBook(id, patch){
  if(mode==='guest'){
    const list = await loadBooks();
    const idx = list.findIndex(b=>b.id===id); if(idx<0) return;
    list[idx] = { ...list[idx], ...patch };
    saveLocal(list);
    return list[idx];
  } else {
    const payload = {};
    if('title' in patch) payload.title = patch.title;
    if('author' in patch) payload.author = patch.author;
    if('type' in patch) payload.type = patch.type;
    if('rating' in patch) payload.rating = patch.rating;
    if('dateRead' in patch) payload.date_read = patch.dateRead || null;
    if('cover' in patch) payload.cover = patch.cover;
    if('note' in patch) payload.note = patch.note;
    if('facing' in patch) payload.facing = patch.facing;
    const { error } = await supabase.from('books').update(payload).eq('id', id);
    if(error) throw error;
  }
}

// ---------- Delete ----------
export async function deleteBook(id){
  if(mode==='guest'){
    const list = await loadBooks();
    saveLocal(list.filter(b=>b.id!==id));
  } else {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if(error) throw error;
  }
}

// ---------- Utilities ----------
export async function syncLocalToCloud(){
  // One-time helper: when user signs in, move guest books into their account
  const user = await getUser(); if(!user) return { moved:0 };
  const local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  if(local.length===0) return { moved:0 };
  const rows = local.map(b => ({
    user_id: user.id,
    title: b.title, author: b.author, type: b.type, rating: b.rating,
    date_read: b.dateRead || null, cover: b.cover, note: b.note, facing: b.facing
  }));
  const { error } = await supabase.from('books').insert(rows);
  if(error) throw error;
  localStorage.removeItem(LOCAL_KEY);
  return { moved: rows.length };
}

export function exportJSON(list){
  return JSON.stringify({ books: list }, null, 2);
}

export async function importJSON(text){
  const data = JSON.parse(text);
  const books = Array.isArray(data.books) ? data.books : [];
  if(mode==='guest'){
    // merge by id (or add with new ids)
    const existing = await loadBooks();
    const byId = Object.fromEntries(existing.map(b=>[b.id,b]));
    books.forEach(b=>{ byId[b.id||randomId()] = { ...b, id: b.id||randomId() }; });
    const merged = Object.values(byId);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
    return merged.length;
  } else {
    const { data: user } = await supabase.auth.getUser();
    const uid = user?.user?.id;
    const rows = books.map(b => ({
      user_id: uid,
      title: b.title, author: b.author, type: b.type, rating: b.rating,
      date_read: b.dateRead || null, cover: b.cover, note: b.note, facing: b.facing
    }));
    if(rows.length===0) return 0;
    const { error } = await supabase.from('books').insert(rows);
    if(error) throw error;
    return rows.length;
  }
}

export function randomId(){
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}
