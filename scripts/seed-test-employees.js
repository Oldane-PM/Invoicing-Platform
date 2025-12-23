const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testEmployees = [
  {
    name: 'Test Employee',
    email: 'employee@test.com',
    role: 'employee',
    status: 'active',
    contract_type: 'Internal Project',
    rate_type: 'hourly',
    hourly_rate: 50,
    overtime_rate: 75,
    position: 'Software Developer',
    department: 'Engineering',
    onboarding_status: 'completed',
    contract_start_date: '2024-01-01',
  },
  {
    name: 'Test Manager',
    email: 'manager@test.com',
    role: 'manager',
    status: 'active',
    contract_type: 'Internal Project',
    rate_type: 'hourly',
    hourly_rate: 75,
    overtime_rate: 100,
    position: 'Engineering Manager',
    department: 'Engineering',
    onboarding_status: 'completed',
    contract_start_date: '2024-01-01',
  },
  {
    name: 'Test Admin',
    email: 'admin@test.com',
    role: 'admin',
    status: 'active',
    contract_type: 'Operational',
    rate_type: 'fixed',
    monthly_rate: 8000,
    position: 'System Administrator',
    department: 'Operations',
    onboarding_status: 'completed',
    contract_start_date: '2024-01-01',
  },
];

async function seedEmployees() {
  console.log('🌱 Seeding test employees...\n');

  for (const employee of testEmployees) {
    try {
      // Check if employee already exists
      const { data: existing } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('email', employee.email)
        .single();

      if (existing) {
        console.log(`✓ ${employee.name} (${employee.role}) already exists - ID: ${existing.id}`);
        continue;
      }

      // Insert new employee
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();

      if (error) {
        console.error(`✗ Failed to create ${employee.name}:`, error.message);
      } else {
        console.log(`✓ Created ${employee.name} (${employee.role}) - ID: ${data.id}`);
      }
    } catch (error) {
      console.error(`✗ Error creating ${employee.name}:`, error.message);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('\nTest Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Employee: employee@test.com');
  console.log('Manager:  manager@test.com');
  console.log('Admin:    admin@test.com');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('ℹ️  Use the sign-in page to select a role and log in');
}

seedEmployees();

