// /js/data.js
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
// Upsert-like behavior: try insert; duplicates will fail silently per RLS; keep it simple
const rows = books.map(b => ({
user_id: userId,
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
