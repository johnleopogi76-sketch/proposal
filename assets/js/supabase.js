/* =========================================================
   CasaHome / RentEase Shared Supabase Module

   IMPORTANT:
   - Use only your Supabase publishable/anon key here.
   - NEVER put a service_role/secret key in browser code.
========================================================= */


const SUPABASE_URL =
  "https://uqobghmfkhdyfuivxyqw.supabase.co";


const SUPABASE_ANON_KEY =
  "sb_publishable_KnMLuq1iF2zMjJGi_psJHw_CKMYfjnP";



/* =========================================================
   LOAD SUPABASE JS CLIENT
========================================================= */

const supabaseScript =
  document.createElement("script");

supabaseScript.src =
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";


supabaseScript.onload = () => {

  window.dispatchEvent(
    new Event("rentease:supabase-ready")
  );

};


document.head.appendChild(
  supabaseScript
);



/* =========================================================
   GET SUPABASE CLIENT
========================================================= */

async function getClient() {

  if (!window.supabase) {

    await new Promise(resolve => {

      window.addEventListener(
        "rentease:supabase-ready",
        resolve,
        {
          once: true
        }
      );

    });

  }


  if (
    !SUPABASE_URL.startsWith("http") ||
    SUPABASE_ANON_KEY.includes("YOUR_")
  ) {

    throw new Error(
      "Add your Supabase Project URL and anon/publishable key in assets/js/supabase.js."
    );

  }


  if (!window.__renteaseClient) {

    window.__renteaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );

  }


  return window.__renteaseClient;

}



/* =========================================================
   ROOMS
========================================================= */


/* READ ROOMS */

async function fetchRooms() {

  const {
    data,
    error
  } = await (
    await getClient()
  )
    .from("rooms")
    .select("*")
    .order("room_number");


  if (error) {
    throw error;
  }


  return data || [];

}



/* UPDATE ROOM STATUS */

async function updateRoomStatus(
  roomId,
  status
) {

  const {
    data,
    error
  } = await (
    await getClient()
  )
    .from("rooms")
    .update({
      status: status
    })
    .eq("id", roomId)
    .select()
    .single();


  if (error) {
    throw error;
  }


  return data;

}



/* =========================================================
   TENANTS / CUSTOMERS
========================================================= */


/* READ ALL TENANTS */

async function fetchTenants() {

  const {
    data,
    error
  } = await (
    await getClient()
  )
    .from("tenants")
    .select(
      "id,full_name,contact_number,room_id,move_in_date,status,created_at,rooms(id,room_number,room_type,rate,status)"
    )
    .order("full_name");


  if (error) {
    throw error;
  }


  return data || [];

}



/* READ ACTIVE TENANTS */

async function fetchActiveTenants() {

  const tenants =
    await fetchTenants();


  return tenants.filter(
    tenant =>
      tenant.status === "Active"
  );

}



/* =========================================================
   PAYMENTS
========================================================= */


/* =========================================================
   READ — FETCH PAYMENTS
========================================================= */

async function fetchPayments() {

  const {
    data,
    error
  } = await (
    await getClient()
  )
    .from("payments")
    .select(
      "id,tenant_id,amount,status,payment_date,created_at,tenants(id,full_name,room_id,rooms(room_number))"
    )
    .order(
      "payment_date",
      {
        ascending: false
      }
    );


  if (error) {
    throw error;
  }


  return data || [];

}



/* =========================================================
   CREATE — RECORD PAYMENT
========================================================= */

async function recordPayment(
  payload
) {

  const {
    data,
    error
  } = await (
    await getClient()
  )
    .from("payments")
    .insert([
      {
        tenant_id:
          payload.tenant_id,

        amount:
          payload.amount,

        status:
          payload.status,

        payment_date:
          payload.payment_date
      }
    ])
    .select()
    .single();


  if (error) {
    throw error;
  }


  return data;

}



/* =========================================================
   UPDATE — UPDATE PAYMENT
========================================================= */

async function updatePayment(
  id,
  payload
) {

  const {
    data,
    error
  } = await (
    await getClient()
  )
    .from("payments")
    .update({

      tenant_id:
        payload.tenant_id,

      amount:
        payload.amount,

      status:
        payload.status,

      payment_date:
        payload.payment_date

    })
    .eq(
      "id",
      id
    )
    .select()
    .single();


  if (error) {
    throw error;
  }


  return data;

}



/* =========================================================
   DELETE — DELETE PAYMENT
========================================================= */

async function deletePaymentRecord(
  id
) {

  const {
    error
  } = await (
    await getClient()
  )
    .from("payments")
    .delete()
    .eq(
      "id",
      id
    );


  if (error) {
    throw error;
  }


  return true;

}



/* =========================================================
   DASHBOARD
========================================================= */

async function fetchDashboardData() {

  const [
    rooms,
    tenants,
    payments
  ] = await Promise.all([

    fetchRooms(),

    fetchTenants(),

    fetchPayments()

  ]);


  const occupied =
    rooms.filter(
      room =>
        room.status === "Occupied"
    ).length;


  return {

    rooms,

    tenants,

    payments,

    metrics: {

      totalRooms:
        rooms.length,

      occupancyRate:
        rooms.length
          ? (
              occupied /
              rooms.length
            ) * 100
          : 0,

      revenue:
        payments
          .filter(
            payment =>
              payment.status === "Paid"
          )
          .reduce(
            (sum, payment) =>
              sum +
              Number(
                payment.amount || 0
              ),
            0
          ),

      pending:
        payments
          .filter(
            payment =>
              payment.status !== "Paid"
          )
          .reduce(
            (sum, payment) =>
              sum +
              Number(
                payment.amount || 0
              ),
            0
          )

    }

  };

}



/* =========================================================
   REALTIME SUBSCRIPTIONS
========================================================= */

function subscribe(
  table,
  callback
) {

  return getClient()
    .then(client => {

      return client
        .channel(
          `rentease-${table}-live`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table
          },
          callback
        )
        .subscribe();

    });

}



/* ROOMS REALTIME */

const subscribeToRooms =
  callback =>
    subscribe(
      "rooms",
      callback
    );



/* TENANTS REALTIME */

const subscribeToTenants =
  callback =>
    subscribe(
      "tenants",
      callback
    );



/* PAYMENTS REALTIME */

const subscribeToPayments =
  callback =>
    subscribe(
      "payments",
      callback
    );



/* =========================================================
   HELPER FUNCTIONS
========================================================= */


/* MONEY FORMAT */

const money =
  value =>
    `₱${Number(
      value || 0
    ).toLocaleString(
      "en-PH",
      {
        minimumFractionDigits: 2,

        maximumFractionDigits: 2
      }
    )}`;



/* DATE FORMAT */

const date =
  value =>
    value
      ? new Date(
          value
        ).toLocaleDateString(
          "en-PH",
          {
            year:
              "numeric",

            month:
              "short",

            day:
              "numeric"
          }
        )
      : "—";



/* HTML ESCAPE */

const esc =
  value =>
    String(
      value ?? ""
    ).replace(
      /[&<>"']/g,
      character =>
        ({
          "&":
            "&amp;",

          "<":
            "&lt;",

          ">":
            "&gt;",

          '"':
            "&quot;",

          "'":
            "&#39;"

        }[character])
    );



/* STATUS BADGES */

const statusClass =
  status => ({

    Paid:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",

    Pending:
      "bg-amber-50 text-amber-800 ring-amber-200",

    Overdue:
      "bg-rose-50 text-rose-700 ring-rose-200",

    Vacant:
      "bg-slate-100 text-slate-700 ring-slate-200",

    Occupied:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",

    Maintenance:
      "bg-orange-50 text-orange-700 ring-orange-200",

    Active:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",

    "Moved Out":
      "bg-slate-100 text-slate-700 ring-slate-200"

  }[status] ||
    "bg-slate-100 text-slate-700 ring-slate-200"
  );
