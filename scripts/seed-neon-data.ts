import { pool } from "../lib/db";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

async function seedAll() {
  console.log("Seeding complete realistic data into Neon database...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // 1. Ensure users in "users" (for employees / clients / agency staff)
    console.log("1. Seeding users and employees...");
    const userRows = [
      {
        id: "a0000001-0000-0000-0000-000000000001",
        email: "abhishekjohncharan@gmail.com",
        fullName: "AbhishekJohn Charan",
        role: "owner",
      },
      {
        id: "a0000001-0000-0000-0000-000000000002",
        email: "sarah.admin@leadyfy.com",
        fullName: "Sarah Jenkins",
        role: "admin",
      },
      {
        id: "a0000001-0000-0000-0000-000000000003",
        email: "priya.sales@leadyfy.com",
        fullName: "Priya Sharma",
        role: "employee",
      },
      {
        id: "a0000001-0000-0000-0000-000000000004",
        email: "rohan.scripts@leadyfy.com",
        fullName: "Rohan Varma",
        role: "employee",
      },
      {
        id: "a0000001-0000-0000-0000-000000000005",
        email: "kabir.shoots@leadyfy.com",
        fullName: "Kabir Malhotra",
        role: "employee",
      },
      {
        id: "a0000001-0000-0000-0000-000000000006",
        email: "vikram.editor@leadyfy.com",
        fullName: "Vikram Das",
        role: "employee",
      },
      {
        id: "a0000001-0000-0000-0000-000000000007",
        email: "ananya.client@auraglow.com",
        fullName: "Ananya Mehta",
        role: "client",
      },
    ];

    for (const u of userRows) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, 'scrypt:dummy_hash_secret', $3, $4::user_role, true)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;`,
        [u.id, u.email, u.fullName, u.role]
      );
    }

    // 2. Employees table
    const employeeData = [
      {
        id: "e0000001-0000-0000-0000-000000000001",
        userId: "a0000001-0000-0000-0000-000000000003",
        subRole: "sales",
        salary: 75000.00,
        joiningDate: "2024-01-15",
      },
      {
        id: "e0000001-0000-0000-0000-000000000002",
        userId: "a0000001-0000-0000-0000-000000000004",
        subRole: "script_writer",
        salary: 65000.00,
        joiningDate: "2024-02-01",
      },
      {
        id: "e0000001-0000-0000-0000-000000000003",
        userId: "a0000001-0000-0000-0000-000000000005",
        subRole: "shoot_manager",
        salary: 80000.00,
        joiningDate: "2024-01-10",
      },
      {
        id: "e0000001-0000-0000-0000-000000000004",
        userId: "a0000001-0000-0000-0000-000000000006",
        subRole: "editor",
        salary: 70000.00,
        joiningDate: "2024-02-15",
      },
    ];

    for (const e of employeeData) {
      await client.query(
        `INSERT INTO employees (id, user_id, sub_role, salary, joining_date, permissions)
         VALUES ($1, $2, $3::employee_sub_role, $4, $5, '{"canEdit": true}'::jsonb)
         ON CONFLICT (user_id) DO UPDATE SET salary = EXCLUDED.salary, sub_role = EXCLUDED.sub_role;`,
        [e.id, e.userId, e.subRole, e.salary, e.joiningDate]
      );
    }

    // 3. Seed Creators
    console.log("2. Seeding creators & availability...");
    const creatorsData = [
      {
        id: "c0000001-0000-0000-0000-000000000001",
        name: "Rhea Sen",
        gender: "Female",
        ageGroup: "21-26",
        languages: ["English", "Hindi"],
        location: "Mumbai, Bandra West",
        niches: ["Beauty & Skincare", "Fashion", "Wellness"],
        rate: 6500.00,
        phone: "+919820011223",
        email: "rhea.sen.ugc@gmail.com",
      },
      {
        id: "c0000001-0000-0000-0000-000000000002",
        name: "Aman Chopra",
        gender: "Male",
        ageGroup: "25-32",
        languages: ["English", "Hindi", "Punjabi"],
        location: "Bengaluru, Koramangala",
        niches: ["Tech & Gadgets", "Fitness", "SaaS & Productivity"],
        rate: 8000.00,
        phone: "+919845099887",
        email: "aman.chopra.ugc@gmail.com",
      },
      {
        id: "c0000001-0000-0000-0000-000000000003",
        name: "Natasha Roy",
        gender: "Female",
        ageGroup: "24-30",
        languages: ["English", "Bengali", "Hindi"],
        location: "Delhi NCR, Cyber City",
        niches: ["Food & Beverage", "D2C Brands", "Lifestyle"],
        rate: 5500.00,
        phone: "+919811033445",
        email: "natasha.roy.creative@gmail.com",
      },
      {
        id: "c0000001-0000-0000-0000-000000000004",
        name: "Sameer Sheikh",
        gender: "Male",
        ageGroup: "20-25",
        languages: ["English", "Hindi"],
        location: "Pune, Viman Nagar",
        niches: ["Gaming", "Streetwear", "Quick Commerce"],
        rate: 4500.00,
        phone: "+919890066778",
        email: "sameer.sheikh.creatives@gmail.com",
      },
    ];

    for (const c of creatorsData) {
      const portfolioUrl = `https://instagram.com/ugc_${c.name.toLowerCase().replace(/\s+/g, '')}`;
      await client.query(
        `INSERT INTO creators (
          id, name, gender, age_group, languages, location, niches, standard_rate, contact_phone, contact_email, portfolio_links
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ARRAY[$11]::text[])
        ON CONFLICT (id) DO UPDATE SET standard_rate = EXCLUDED.standard_rate;`,
        [c.id, c.name, c.gender, c.ageGroup, c.languages, c.location, c.niches, c.rate, c.phone, c.email, portfolioUrl]
      );
    }

    // Creator availability
    for (let day = 1; day <= 10; day++) {
      const dateStr = `2026-09-${day < 10 ? "0" + day : day}`;
      await client.query(
        `INSERT INTO creator_availability (creator_id, date, status, notes)
         VALUES ($1, $2, 'available'::creator_availability_status, 'Available for full-day studio/location shoots')
         ON CONFLICT (creator_id, date) DO NOTHING;`,
        ["c0000001-0000-0000-0000-000000000001", dateStr]
      );
      await client.query(
        `INSERT INTO creator_availability (creator_id, date, status, notes)
         VALUES ($1, $2, 'available'::creator_availability_status, 'Morning slot open')
         ON CONFLICT (creator_id, date) DO NOTHING;`,
        ["c0000001-0000-0000-0000-000000000002", dateStr]
      );
    }

    // 4. Seed Clients
    console.log("3. Seeding clients...");
    const clientData = [
      {
        id: "b0000001-0000-0000-0000-000000000001",
        userId: "a0000001-0000-0000-0000-000000000007",
        clientName: "Ananya Mehta",
        companyName: "AuraGlow Cosmetics Pvt Ltd",
        email: "ananya.client@auraglow.com",
        phone: "+919876543210",
        whatsapp: "+919876543210",
        brandName: "AuraGlow Organics",
        industry: "Beauty & Personal Care",
        gstTaxId: "27AABCA1234F1Z5",
        status: "active",
        notes: "Key D2C beauty client with aggressive monthly UGC creative testing requirement.",
      },
      {
        id: "b0000001-0000-0000-0000-000000000002",
        userId: null,
        clientName: "Kunal Bansal",
        companyName: "ZenPulse Smart Fitness India",
        email: "kunal@zenpulse.fit",
        phone: "+919823456789",
        whatsapp: "+919823456789",
        brandName: "ZenPulse Rings",
        industry: "Consumer Electronics & Wearables",
        gstTaxId: "29AABCZ9876E1Z1",
        status: "onboarding",
        notes: "Scaling product line with smart health tracking wearables. High conversion hook requirements.",
      },
      {
        id: "b0000001-0000-0000-0000-000000000003",
        userId: null,
        clientName: "Devika Rao",
        companyName: "NutriFuel Snack Labs",
        email: "devika@nutrifuel.in",
        phone: "+919812345678",
        whatsapp: "+919812345678",
        brandName: "NutriFuel Protein Crisps",
        industry: "Food & Beverage",
        gstTaxId: "07AAACN5432B1Z8",
        status: "active",
        notes: "Healthy snacking brand running Meta and TikTok ad campaigns.",
      },
      {
        id: "b0000001-0000-0000-0000-000000000004",
        userId: null,
        clientName: "Arjun Nair",
        companyName: "SwiftDesk Workspace Solutions",
        email: "arjun@swiftdesk.co",
        phone: "+919890123456",
        whatsapp: "+919890123456",
        brandName: "SwiftDesk AI",
        industry: "B2B SaaS",
        gstTaxId: "33AABCS8899D1ZG",
        status: "new",
        notes: "SaaS platform wanting short-form testimonial videos and UI screen demo overlays.",
      },
    ];

    for (const cl of clientData) {
      await client.query(
        `INSERT INTO clients (
          id, user_id, client_name, company_name, email, phone, whatsapp, brand_name,
          industry, gst_tax_id, status, notes, organization_id, is_archived
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::client_status, $12, $13, false
        ) ON CONFLICT (id) DO UPDATE SET
          client_name = EXCLUDED.client_name,
          company_name = EXCLUDED.company_name,
          status = EXCLUDED.status;`,
        [
          cl.id,
          cl.userId,
          cl.clientName,
          cl.companyName,
          cl.email,
          cl.phone,
          cl.whatsapp,
          cl.brandName,
          cl.industry,
          cl.gstTaxId,
          cl.status,
          cl.notes,
          DEFAULT_ORG_ID,
        ]
      );
    }

    // 5. Seed Packages & Orders
    console.log("4. Seeding packages & orders...");
    const orderData = [
      {
        id: "d0000001-0000-0000-0000-000000000001",
        clientId: "b0000001-0000-0000-0000-000000000001",
        packageName: "UGC Growth Tier",
        packageSnapshot: "UGC Growth Tier",
        videoCount: 20,
        pricing: 45000.00,
        gstTax: 8100.00,
        totalInvoice: 53100.00,
        amountReceived: 26550.00,
        status: "in_production",
        startDate: "2026-09-01",
        dueDate: "2026-09-30",
      },
      {
        id: "d0000001-0000-0000-0000-000000000002",
        clientId: "b0000001-0000-0000-0000-000000000003",
        packageName: "UGC Starter Tier",
        packageSnapshot: "UGC Starter Tier",
        videoCount: 10,
        pricing: 25000.00,
        gstTax: 4500.00,
        totalInvoice: 29500.00,
        amountReceived: 29500.00,
        status: "in_production",
        startDate: "2026-09-05",
        dueDate: "2026-09-25",
      },
      {
        id: "d0000001-0000-0000-0000-000000000003",
        clientId: "b0000001-0000-0000-0000-000000000002",
        packageName: "UGC Pro Scale",
        packageSnapshot: "UGC Pro Scale",
        videoCount: 50,
        pricing: 90000.00,
        gstTax: 16200.00,
        totalInvoice: 106200.00,
        amountReceived: 0.00,
        status: "onboarding",
        startDate: "2026-09-12",
        dueDate: "2026-10-15",
      },
    ];

    for (const o of orderData) {
      await client.query(
        `INSERT INTO orders (
          id, client_id, package_name, package_name_snapshot, contracted_video_count,
          pricing, gst_tax, total_invoice_amount, amount_received,
          start_date, due_date, status, organization_id,
          ordered_videos_quota, assigned_videos, completed_videos, delivered_videos, remaining_quota
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::order_status, $13,
          $5, 0, 0, 0, $5
        ) ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          pricing = EXCLUDED.pricing,
          amount_received = EXCLUDED.amount_received;`,
        [
          o.id,
          o.clientId,
          o.packageName,
          o.packageSnapshot,
          o.videoCount,
          o.pricing,
          o.gstTax,
          o.totalInvoice,
          o.amountReceived,
          o.startDate,
          o.dueDate,
          o.status,
          DEFAULT_ORG_ID,
        ]
      );
    }

    // 6. Seed Scripts
    console.log("5. Seeding scripts...");
    const scriptsData = [
      {
        id: "50000001-0000-0000-0000-000000000001",
        clientId: "b0000001-0000-0000-0000-000000000001",
        orderId: "d0000001-0000-0000-0000-000000000001",
        videoNumber: 1,
        writerId: "e0000001-0000-0000-0000-000000000002",
        creatorId: "c0000001-0000-0000-0000-000000000001",
        language: "English",
        status: "approved",
        scriptText: `[HOOK - 0-3s]\n"Stop scrolling if you have stubborn dark spots that won't go away!"\n\n[BODY - 3-15s]\nShow product AuraGlow Serum dropper. "I spent ₹10,000 on dermatology visits until I discovered this 10% Niacinamide blend..."\n\n[CTA - 15-20s]\n"Click below to get 25% off your first bottle before it sells out!"`,
      },
      {
        id: "50000001-0000-0000-0000-000000000002",
        clientId: "b0000001-0000-0000-0000-000000000001",
        orderId: "d0000001-0000-0000-0000-000000000001",
        videoNumber: 2,
        writerId: "e0000001-0000-0000-0000-000000000002",
        creatorId: "c0000001-0000-0000-0000-000000000003",
        language: "Hindi",
        status: "ready_for_shoot",
        scriptText: `[HOOK - 0-3s]\n"क्या आपकी स्किन भी मॉनसून में डल हो जाती है?"\n\n[BODY - 3-15s]\n"AuraGlow का 3-स्टेप ब्राइटनिंग किट सिर्फ 7 दिनों में ग्लो देता है। ನೋ കെമിക്കൽಸ್, 100% ಆರ್ಗ್ಯಾನಿಕ್..."\n\n[CTA]\n"Shop now from link in bio for Buy 1 Get 1 free offer."`,
      },
      {
        id: "50000001-0000-0000-0000-000000000003",
        clientId: "b0000001-0000-0000-0000-000000000003",
        orderId: "d0000001-0000-0000-0000-000000000002",
        videoNumber: 1,
        writerId: "e0000001-0000-0000-0000-000000000002",
        creatorId: "c0000001-0000-0000-0000-000000000002",
        language: "English",
        status: "ready_for_shoot",
        scriptText: `[HOOK]\n"Fitness coaches lied to you about snacking on diet!"\n\n[BODY]\n"Crunch test: NutriFuel Protein Crisps pack 22g of whey protein with only 120 calories. Tastes exactly like spicy nacho cheese."\n\n[CTA]\n"Use code CRUNCH20 for 20% instant discount."`,
      },
    ];

    for (const sc of scriptsData) {
      await client.query(
        `INSERT INTO scripts (
          id, client_id, order_id, video_number, writer_id, creator_id, language, script_text, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::script_status)
        ON CONFLICT (id) DO UPDATE SET script_text = EXCLUDED.script_text, status = EXCLUDED.status;`,
        [sc.id, sc.clientId, sc.orderId, sc.videoNumber, sc.writerId, sc.creatorId, sc.language, sc.scriptText, sc.status]
      );
    }

    // 7. Seed Shoots
    console.log("6. Seeding shoots...");
    const shootsData = [
      {
        id: "f0000001-0000-0000-0000-000000000001",
        clientId: "b0000001-0000-0000-0000-000000000001",
        orderId: "d0000001-0000-0000-0000-000000000001",
        creatorId: "c0000001-0000-0000-0000-000000000001",
        shootManagerId: "e0000001-0000-0000-0000-000000000003",
        scheduledStart: "2026-09-22 10:00:00+05:30",
        scheduledEnd: "2026-09-22 14:00:00+05:30",
        location: "Leadyfy Studio 1, Andheri East, Mumbai",
        status: "confirmed",
        preScriptApproved: true,
        preCreatorConfirmed: true,
        preLocationPermissions: true,
        preClientProductReceived: true,
        preTeamBriefed: true,
      },
      {
        id: "f0000001-0000-0000-0000-000000000002",
        clientId: "b0000001-0000-0000-0000-000000000003",
        orderId: "d0000001-0000-0000-0000-000000000002",
        creatorId: "c0000001-0000-0000-0000-000000000002",
        shootManagerId: "e0000001-0000-0000-0000-000000000003",
        scheduledStart: "2026-09-23 14:30:00+05:30",
        scheduledEnd: "2026-09-23 18:00:00+05:30",
        location: "Gold's Gym Koramangala & Kitchen Setup, Bengaluru",
        status: "scheduled",
        preScriptApproved: true,
        preCreatorConfirmed: true,
        preLocationPermissions: true,
        preClientProductReceived: true,
        preTeamBriefed: true,
      },
    ];

    for (const sh of shootsData) {
      await client.query(
        `INSERT INTO shoots (
          id, client_id, order_id, creator_id, shoot_manager_id, scheduled_start, scheduled_end,
          location, status, pre_script_approved, pre_creator_confirmed, pre_location_permissions,
          pre_client_product_received, pre_team_briefed
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::shoot_status, $10, $11, $12, $13, $14
        ) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;`,
        [
          sh.id,
          sh.clientId,
          sh.orderId,
          sh.creatorId,
          sh.shootManagerId,
          sh.scheduledStart,
          sh.scheduledEnd,
          sh.location,
          sh.status,
          sh.preScriptApproved,
          sh.preCreatorConfirmed,
          sh.preLocationPermissions,
          sh.preClientProductReceived,
          sh.preTeamBriefed,
        ]
      );
    }

    // 8. Seed Videos & Pipeline
    console.log("7. Seeding videos & pipeline...");
    const videosData = [
      {
        id: "60000001-0000-0000-0000-000000000001",
        clientId: "b0000001-0000-0000-0000-000000000001",
        orderId: "d0000001-0000-0000-0000-000000000001",
        scriptId: "50000001-0000-0000-0000-000000000001",
        creatorId: "c0000001-0000-0000-0000-000000000001",
        shootId: "f0000001-0000-0000-0000-000000000001",
        assignedEditorId: "e0000001-0000-0000-0000-000000000004",
        pipelineStatus: "video_editing",
        videoDriveUrl: "https://drive.google.com/drive/folders/auraglow_ugc_01_raw",
        thumbnailUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800",
      },
      {
        id: "60000001-0000-0000-0000-000000000002",
        clientId: "b0000001-0000-0000-0000-000000000001",
        orderId: "d0000001-0000-0000-0000-000000000001",
        scriptId: "50000001-0000-0000-0000-000000000002",
        creatorId: "c0000001-0000-0000-0000-000000000003",
        shootId: null,
        assignedEditorId: "e0000001-0000-0000-0000-000000000004",
        pipelineStatus: "shoot_pending",
        videoDriveUrl: null,
        thumbnailUrl: null,
      },
      {
        id: "60000001-0000-0000-0000-000000000003",
        clientId: "b0000001-0000-0000-0000-000000000003",
        orderId: "d0000001-0000-0000-0000-000000000002",
        scriptId: "50000001-0000-0000-0000-000000000003",
        creatorId: "c0000001-0000-0000-0000-000000000002",
        shootId: "f0000001-0000-0000-0000-000000000002",
        assignedEditorId: "e0000001-0000-0000-0000-000000000004",
        pipelineStatus: "delivered",
        videoDriveUrl: "https://drive.google.com/drive/folders/nutrifuel_delivery_final",
        thumbnailUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
      },
    ];

    for (const v of videosData) {
      await client.query(
        `INSERT INTO videos (
          id, client_id, order_id, script_id, creator_id, shoot_id, assigned_editor_id,
          pipeline_status, video_drive_url, thumbnail_url
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::video_pipeline_status, $9, $10
        ) ON CONFLICT (id) DO UPDATE SET pipeline_status = EXCLUDED.pipeline_status;`,
        [
          v.id,
          v.clientId,
          v.orderId,
          v.scriptId,
          v.creatorId,
          v.shootId,
          v.assignedEditorId,
          v.pipelineStatus,
          v.videoDriveUrl,
          v.thumbnailUrl,
        ]
      );
    }

    // 9. Video Feedback
    console.log("8. Seeding video feedback...");
    await client.query(
      `INSERT INTO video_feedback (video_id, author_id, timestamp_seconds, feedback_text)
       VALUES (
         $1, $2, 4,
         'Can we speed up the b-roll transition here and zoom into the serum texture with ASMR sound effects?'
       ) ON CONFLICT DO NOTHING;`,
      ["60000001-0000-0000-0000-000000000001", "a0000001-0000-0000-0000-000000000007"]
    );

    // 10. Financials: Payments (Client Receivables)
    console.log("9. Seeding payments...");
    const paymentsData = [
      {
        id: "70000001-0000-0000-0000-000000000001",
        orderId: "d0000001-0000-0000-0000-000000000001",
        invoiceNumber: "INV-2026-0091",
        invoiceAmount: 53100.00,
        amountReceived: 26550.00,
        paymentDate: "2026-09-02 12:30:00+05:30",
        paymentMethod: "Bank NEFT Transfer",
        transactionRef: "HDFC98234710129",
        status: "partially_paid",
        notes: "50% advance received on contract signing. Remaining 50% upon batch 1 delivery.",
      },
      {
        id: "70000001-0000-0000-0000-000000000002",
        orderId: "d0000001-0000-0000-0000-000000000002",
        invoiceNumber: "INV-2026-0092",
        invoiceAmount: 29500.00,
        amountReceived: 29500.00,
        paymentDate: "2026-09-06 15:00:00+05:30",
        paymentMethod: "Razorpay / UPI",
        transactionRef: "pay_Q82Hks92nF10",
        status: "paid",
        notes: "100% upfront package payment cleared.",
      },
    ];

    for (const p of paymentsData) {
      await client.query(
        `INSERT INTO payments (
          id, order_id, invoice_number, invoice_amount, amount_received,
          payment_date, payment_method, transaction_ref, status, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::payment_status, $10
        ) ON CONFLICT (invoice_number) DO UPDATE SET amount_received = EXCLUDED.amount_received;`,
        [
          p.id,
          p.orderId,
          p.invoiceNumber,
          p.invoiceAmount,
          p.amountReceived,
          p.paymentDate,
          p.paymentMethod,
          p.transactionRef,
          p.status,
          p.notes,
        ]
      );
    }

    // 11. Financials: Agency Expenses
    console.log("10. Seeding agency expenses...");
    const expensesData = [
      {
        category: "studio",
        amount: 15000.00,
        date: "2026-09-04",
        notes: "Studio acoustic panel upgrade & softbox lighting kit",
      },
      {
        category: "salaries",
        amount: 280000.00,
        date: "2026-09-01",
        notes: "September month internal production pod salary disbursements",
      },
      {
        category: "office",
        amount: 8500.00,
        date: "2026-09-10",
        notes: "High-speed optical fiber leased line internet & cloud storage subscriptions",
      },
    ];

    for (const ex of expensesData) {
      await client.query(
        `INSERT INTO expenses (category, amount, logged_by_user_id, expense_date, notes)
         VALUES ($1::expense_category, $2, $3, $4, $5);`,
        [ex.category, ex.amount, "a0000001-0000-0000-0000-000000000001", ex.date, ex.notes]
      );
    }

    // 12. Financials: Creator Payouts
    console.log("11. Seeding creator payouts...");
    await client.query(
      `INSERT INTO creator_payouts (
        creator_id, order_id, shoot_id, video_count, contracted_rate, total_payout,
        payment_date, transaction_reference, status
      ) VALUES (
        $1, $2, $3, 1, 6500.00, 6500.00, NOW(), 'UPI-CREATOR-RHEA-01', 'paid'::payout_status
      ) ON CONFLICT (creator_id, shoot_id) DO NOTHING;`,
      [
        "c0000001-0000-0000-0000-000000000001",
        "d0000001-0000-0000-0000-000000000001",
        "f0000001-0000-0000-0000-000000000001",
      ]
    );

    // 13. Operational Tasks
    console.log("12. Seeding operational tasks...");
    const tasksData = [
      {
        title: "Review Hook 3 for AuraGlow Serum Script",
        description: "Verify that hook angle 3 adheres to ASCI advertising guidelines for organic claims.",
        assignedToId: "e0000001-0000-0000-0000-000000000002",
        priority: "high",
        status: "in_progress",
        deadline: "2026-09-21 18:00:00+05:30",
      },
      {
        title: "Pre-shoot gear check for Studio Pod 1",
        description: "Charge all Sony FX3 batteries, format Angelbird V90 SD cards, and test wireless lav mics.",
        assignedToId: "e0000001-0000-0000-0000-000000000003",
        priority: "urgent",
        status: "todo",
        deadline: "2026-09-22 09:00:00+05:30",
      },
      {
        title: "Export 9:16 vertical color-graded cuts for NutriFuel",
        description: "Deliver Rec.709 H.264 exports formatted for Instagram Reels and Meta Ads.",
        assignedToId: "e0000001-0000-0000-0000-000000000004",
        priority: "medium",
        status: "done",
        deadline: "2026-09-18 17:00:00+05:30",
      },
    ];

    for (const t of tasksData) {
      await client.query(
        `INSERT INTO tasks (title, description, assigned_to_id, priority, status, deadline)
         VALUES ($1, $2, $3, $4::task_priority, $5::task_status, $6);`,
        [t.title, t.description, t.assignedToId, t.priority, t.status, t.deadline]
      );
    }

    // 14. Support Tickets
    console.log("13. Seeding support tickets...");
    await client.query(
      `INSERT INTO support_tickets (client_id, subject, description, status, assigned_employee_id)
       VALUES (
         $1, 'Request for raw footage access in 4K ProRes',
         'Our in-house design team wants access to uncut raw takes for static website banner cutouts.',
         'open'::ticket_status, $2
       );`,
      ["b0000001-0000-0000-0000-000000000001", "e0000001-0000-0000-0000-000000000001"]
    );

    // 15. Notifications
    console.log("14. Seeding notifications...");
    const notifs = [
      {
        userId: "a0000001-0000-0000-0000-000000000001",
        title: "New Client Commitment Added",
        message: "NutriFuel Snack Labs has completed upfront payment of ₹29,500.",
        eventType: "ORDER_CREATED",
      },
      {
        userId: "a0000001-0000-0000-0000-000000000001",
        title: "Shoot Confirmed",
        message: "Shoot with Rhea Sen for AuraGlow Cosmetics is locked for Sep 22 at Studio 1.",
        eventType: "SHOOT_CONFIRMED",
      },
    ];

    for (const n of notifs) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, event_type, is_read)
         VALUES ($1, $2, $3, $4, false);`,
        [n.userId, n.title, n.message, n.eventType]
      );
    }

    // 16. Digital Assets
    console.log("15. Seeding brand assets...");
    const assetsData = [
      {
        clientId: "b0000001-0000-0000-0000-000000000001",
        orderId: "d0000001-0000-0000-0000-000000000001",
        fileName: "AuraGlow_Primary_Vector_Logo.svg",
        fileType: "image/svg+xml",
        fileUrl: "https://storage.googleapis.com/leadyfy-assets/auraglow/logo_vector.svg",
        fileSizeBytes: 142800,
      },
      {
        clientId: "b0000001-0000-0000-0000-000000000001",
        orderId: "d0000001-0000-0000-0000-000000000001",
        fileName: "AuraGlow_Brand_Guidelines_2026.pdf",
        fileType: "application/pdf",
        fileUrl: "https://storage.googleapis.com/leadyfy-assets/auraglow/brand_guidelines.pdf",
        fileSizeBytes: 4892000,
      },
    ];

    for (const a of assetsData) {
      await client.query(
        `INSERT INTO assets (client_id, order_id, file_name, file_type, file_url, file_size_bytes, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [a.clientId, a.orderId, a.fileName, a.fileType, a.fileUrl, a.fileSizeBytes, "a0000001-0000-0000-0000-000000000001"]
      );
    }

    await client.query("COMMIT;");
    console.log("All data successfully committed to remote Neon PostgreSQL database!");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("Seeding error:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAll().catch(console.error);
