const assert = require('assert')
const path = require('path')
const fs = require('fs')
const EventEmitter = require('events')
const Store = require('../src/store')
const Scheduler = require('../src/scheduler')

// Mock powerMonitor
class MockPowerMonitor extends EventEmitter {}

async function runTests() {
  console.log('🧪 Running Waifu Break Enforcer Test Suite...\n')

  const testDbPath = path.join(__dirname, 'test-settings.json')
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath)

  // 1. Test Store
  console.log('1️⃣ Testing Store...')
  const store = new Store(testDbPath)
  assert.strictEqual(store.get('workIntervalMinutes'), 60, 'Default work interval should be 60')
  assert.strictEqual(store.get('breakDurationMinutes'), 15, 'Default break duration should be 15')
  assert.strictEqual(store.get('character'), 'dinki', 'Default character should be dinki')

  store.set('character', 'asuka')
  assert.strictEqual(store.get('character'), 'asuka', 'Character should update to asuka')

  // Verify persistence
  const reloadedStore = new Store(testDbPath)
  assert.strictEqual(reloadedStore.get('character'), 'asuka', 'Persistence should preserve asuka')

  // 2. Test Scheduler
  console.log('2️⃣ Testing Scheduler state machine...')
  const powerMonitor = new MockPowerMonitor()
  const scheduler = new Scheduler(store, powerMonitor)

  // Set fast test interval (e.g. 0.05 min = 3 seconds work, 0.05 min = 3 seconds break)
  store.set({ workIntervalMinutes: 0.05, breakDurationMinutes: 0.05 })

  let startedEventReceived = false
  scheduler.once('started', (status) => {
    startedEventReceived = true
    assert.strictEqual(status.state, 'working')
  })

  scheduler.start()
  assert.strictEqual(startedEventReceived, true, 'Should emit started event')
  assert.strictEqual(scheduler.state, 'working', 'Scheduler state should be working')

  // 3. Test Manual Break Trigger
  console.log('3️⃣ Testing manual break trigger...')
  let breakStartReceived = false
  scheduler.once('break-start', (status) => {
    breakStartReceived = true
    assert.strictEqual(status.state, 'break')
  })

  scheduler.triggerBreakNow()
  assert.strictEqual(breakStartReceived, true, 'Should emit break-start event')
  assert.strictEqual(scheduler.state, 'break', 'State should be break')

  // 4. Test Pause & Resume
  console.log('4️⃣ Testing Pause & Resume...')
  scheduler.pause()
  assert.strictEqual(scheduler.state, 'paused', 'State should be paused')

  scheduler.resume()
  assert.strictEqual(scheduler.state, 'break', 'State should resume to break')

  // 5. Test Skip Break
  console.log('5️⃣ Testing Skip Break...')
  let breakEndReceived = false
  scheduler.once('break-end', ({ reason }) => {
    breakEndReceived = true
    assert.strictEqual(reason, 'skipped', 'Break end reason should be skipped')
  })

  scheduler.skipBreak()
  assert.strictEqual(breakEndReceived, true, 'Should emit break-end on skip')
  assert.strictEqual(scheduler.state, 'working', 'State should return to working after skip')

  // 6. Test PowerMonitor Sleep/Wake Simulation
  console.log('6️⃣ Testing PowerMonitor sleep/wake simulation...')
  powerMonitor.emit('suspend')
  assert.strictEqual(scheduler.state, 'paused', 'System suspend should pause scheduler')

  powerMonitor.emit('resume')
  assert.strictEqual(scheduler.state, 'working', 'System resume should resume scheduler')

  scheduler.destroy()
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath)

  console.log('\n✅ All Tests Passed Successfully!')
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err)
  process.exit(1)
})
