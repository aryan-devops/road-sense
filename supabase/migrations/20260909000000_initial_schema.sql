-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('researcher', 'administrator', 'operator')) default 'researcher',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can view all profiles." 
  on profiles for select using (true);

create policy "Users can update own profile." 
  on profiles for update using (auth.uid() = id);

-- Trigger to automatically create a profile when a new auth user signs up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'researcher'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Create Scenarios Table
create table public.scenarios (
  id text primary key,
  name text not null,
  description text,
  difficulty text check (difficulty in ('EASY', 'MEDIUM', 'HARD', 'EXTREME')),
  environment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.scenarios enable row level security;

create policy "Anyone can read scenarios."
  on scenarios for select using (true);

create policy "Only administrators can insert/update scenarios."
  on scenarios for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'administrator')
  );


-- 3. Create Simulation History Table
create table public.simulation_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  scenario_id text references public.scenarios(id) on delete set null,
  scenario_name text not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  safety_score integer not null,
  collision_count integer not null,
  replanning_count integer not null,
  completion_rate numeric not null,
  duration integer not null
);

alter table public.simulation_history enable row level security;

create policy "Users can view their own simulation history."
  on simulation_history for select using (auth.uid() = user_id);

create policy "Users can insert their own simulation history."
  on simulation_history for insert with check (auth.uid() = user_id);

create policy "Administrators can view all simulation history."
  on simulation_history for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'administrator')
  );


-- Seed Data for Scenarios
insert into public.scenarios (id, name, description, difficulty, environment) values
  ('sih-001-village-road', 'Unmarked Village Road', 'Navigate through narrow village roads with unpredictable agents.', 'HARD', 'rural'),
  ('sih-002-urban-intersection', 'Busy Urban Intersection', 'Handle dense traffic, auto-rickshaws, and pedestrians.', 'EXTREME', 'urban'),
  ('sih-003-highway-merge', 'Highway Merge', 'Merge onto high-speed highways safely.', 'HARD', 'highway'),
  ('sih-004-dense-market', 'Dense Market Area', 'Extremely cluttered scene with carts and unstructured parking.', 'EXTREME', 'urban'),
  ('sih-005-cattle-crossing', 'Sudden Cattle Crossing', 'React safely to animals entering the roadway unpredictably.', 'HARD', 'rural');
