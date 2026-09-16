/* RentEase shared Supabase module.
   Replace the two constants below with your project credentials.
   Never put a service_role/secret key in browser code. */
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY";

const supabaseScript = document.createElement("script");
supabaseScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
supabaseScript.onload = () => window.dispatchEvent(new Event("rentease:supabase-ready"));
document.head.appendChild(supabaseScript);

async function getClient() {
  if (!window.supabase) {
    await new Promise(resolve => window.addEventListener("rentease:supabase-ready", resolve, { once: true }));
  }
  if (!SUPABASE_URL.startsWith("http") || SUPABASE_ANON_KEY.includes("YOUR_")) {
    throw new Error("Add your Supabase Project URL and anon/publishable key in assets/js/supabase.js.");
  }
  if (!window.__renteaseClient) {
    window.__renteaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return window.__renteaseClient;
}

async function fetchRooms() {
  const { data, error } = await (await getClient()).from("rooms").select("*").order("room_number");
  if (error) throw error;
  return data || [];
}
async function fetchTenants() {
  const { data, error } = await (await getClient()).from("tenants")
    .select("id,full_name,contact_number,room_id,move_in_date,status,created_at,rooms(id,room_number,room_type,rate,status)")
    .order("full_name");
  if (error) throw error;
  return data || [];
}
async function fetchActiveTenants() {
  return (await fetchTenants()).filter(t => t.status === "Active");
}
async function updateRoomStatus(roomId, status) {
  const { data, error } = await (await getClient()).from("rooms").update({ status }).eq("id", roomId).select().single();
  if (error) throw error;
  return data;
}
async function fetchPayments() {
  const { data, error } = await (await getClient()).from("payments")
    .select("id,tenant_id,amount,status,payment_date,created_at,tenants(id,full_name,room_id,rooms(room_number))")
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function recordPayment(payload) {
  const { data, error } = await (await getClient()).from("payments").insert([payload]).select().single();
  if (error) throw error;
  return data;
}
async function fetchDashboardData() {
  const [rooms, tenants, payments] = await Promise.all([fetchRooms(), fetchTenants(), fetchPayments()]);
  const occupied = rooms.filter(r => r.status === "Occupied").length;
  return {
    rooms, tenants, payments,
    metrics: {
      totalRooms: rooms.length,
      occupancyRate: rooms.length ? occupied / rooms.length * 100 : 0,
      revenue: payments.filter(p => p.status === "Paid").reduce((s,p) => s + Number(p.amount||0), 0),
      pending: payments.filter(p => p.status !== "Paid").reduce((s,p) => s + Number(p.amount||0), 0)
    }
  };
}
function subscribe(table, callback) {
  return getClient().then(client => client.channel(`rentease-${table}-live`)
    .on("postgres_changes", { event: "*", schema: "public", table }, callback)
    .subscribe());
}
const subscribeToRooms = cb => subscribe("rooms", cb);
const subscribeToTenants = cb => subscribe("tenants", cb);
const subscribeToPayments = cb => subscribe("payments", cb);

const money = value => `₱${Number(value||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date = value => value ? new Date(value).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"}) : "—";
const esc = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusClass = status => ({
  Paid:"bg-emerald-50 text-emerald-700 ring-emerald-200", Pending:"bg-amber-50 text-amber-800 ring-amber-200",
  Overdue:"bg-rose-50 text-rose-700 ring-rose-200", Vacant:"bg-slate-100 text-slate-700 ring-slate-200",
  Occupied:"bg-emerald-50 text-emerald-700 ring-emerald-200", Maintenance:"bg-orange-50 text-orange-700 ring-orange-200",
  Active:"bg-emerald-50 text-emerald-700 ring-emerald-200", "Moved Out":"bg-slate-100 text-slate-700 ring-slate-200"
}[status] || "bg-slate-100 text-slate-700 ring-slate-200");
