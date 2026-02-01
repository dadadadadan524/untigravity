import Phaser from 'phaser'

const scoreEl = document.getElementById('score')
const setScore = (v: number) => {
  if (scoreEl) scoreEl.textContent = String(v)
}

class MainScene extends Phaser.Scene {
  private bird!: Phaser.Physics.Arcade.Sprite
  private humans!: Phaser.Physics.Arcade.Group
  private poopGroup!: Phaser.Physics.Arcade.Group

  private score = 0
  private birdBaseY = 100

  constructor() {
    super('MainScene')
  }

  preload() {
    this.makeTextures()
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height

    this.physics.world.setBounds(0, 0, w, h + 200) // Lower bound extended for falling poops
    // Gradient-ish background
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xe0f6ff, 0xe0f6ff, 1)
    bg.fillRect(0, 0, w, h)

    // Bird
    this.birdBaseY = 100
    this.bird = this.physics.add.sprite(w / 2, this.birdBaseY, 'bird')
    this.bird.setCollideWorldBounds(true)
    this.bird.setBounce(1, 0)
    this.bird.setVelocityX(120) // Slower, like legacy
    this.bird.setCircle(22)

    // Humans
    this.humans = this.physics.add.group({
      immovable: false, // They need to move when hit (float up)
      allowGravity: false, // We control vertical movement manually
    })

    this.spawnHumans(w, h)

    // Poops
    this.poopGroup = this.physics.add.group({
      collideWorldBounds: false, // Let them fall out
    })

    // Collisions
    this.physics.add.overlap(this.poopGroup, this.humans, (poopObj, humanObj) => {
      this.onHit(poopObj as Phaser.Physics.Arcade.Sprite, humanObj as Phaser.Physics.Arcade.Sprite)
    })

    // Controls
    this.input.on('pointerdown', () => this.dropPoop())
    this.input.keyboard?.on('keydown-SPACE', () => this.dropPoop())

    // Resize
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      bg.clear()
      bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xe0f6ff, 0xe0f6ff, 1)
      bg.fillRect(0, 0, size.width, size.height)

      this.physics.world.setBounds(0, 0, size.width, size.height + 200)
    })

    setScore(this.score)
  }

  update() {
    const birdBody = this.bird.body as Phaser.Physics.Arcade.Body
    if (this.bird.x < 22 && birdBody.velocity.x < 0) this.bird.setVelocityX(120)
    if (this.bird.x > this.scale.width - 22 && birdBody.velocity.x > 0) this.bird.setVelocityX(-120)

    // Keep bird Y stable
    this.bird.y = this.birdBaseY
    this.bird.setVelocityY(0)

    // Float hit humans
    this.humans.children.iterate((c) => {
      const human = c as Phaser.Physics.Arcade.Sprite
      if (human.getData('hit')) {
        // Accelerate upwards (Legacy: vy -= 0.2 per frame)
        // Phaser uses velocity per second. 60fps -> 0.2 * 60 = 12px/s^2 ? 
        // Actually legacy was simplified physics. Let's just set a constant upward velocity or acceleration.
        human.setAccelerationY(-20)
        // or just add to velocity manually to match legacy feel exactly
        const humanBody = human.body as Phaser.Physics.Arcade.Body
        const currentVy = humanBody.velocity.y
        human.setVelocityY(currentVy - 5)
      }
      return true
    })

    // Remove poops that fell out
    this.poopGroup.children.iterate((c) => {
      const p = c as Phaser.Physics.Arcade.Sprite
      if (p.y > this.scale.height + 50) {
        p.destroy()
      }
      return true
    })
  }

  private spawnHumans(w: number, h: number) {
    this.humans.clear(true, true)
    const count = 6
    const startX = 120
    const spacing = 180

    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing
      if (x > w - 40) break // Don't spawn off-screen

      const human = this.humans.create(x, h - 80, 'human') as Phaser.Physics.Arcade.Sprite
      human.setOrigin(0, 0) // Legacy drew rects from top-left. Let's match origin to make positions easy.
      // Actually sprite center is easier for physics.
      // Legacy: x, y is top-left. w=40, h=80.
      // Let's use center.
      human.setPosition(x + 20, h - 120 + 40) // y was H - 120. (top). Center is H - 120 + 40.
      human.setData('hit', false)
    }
  }

  private dropPoop() {
    const poop = this.physics.add.sprite(this.bird.x, this.bird.y + 22, 'poop')
    poop.setCircle(8) // r=6~8 + margin

    // Legacy: vx = (Math.random() - 0.5) * 1.5;
    // Phaser: scale up (approx * 60 for px/sec) -> +/- 45
    poop.setVelocityX(Phaser.Math.Between(-45, 45))
    poop.setVelocityY(0)
    this.poopGroup.add(poop)
  }

  private onHit(poop: Phaser.Physics.Arcade.Sprite, human: Phaser.Physics.Arcade.Sprite) {
    if (human.getData('hit')) return // Already hit

    human.setData('hit', true)
    human.setTint(0xffaaaa)

    this.score++
    setScore(this.score)

    // Bounce poop (Legacy: vy *= -0.3, vx *= 1.2)
    const body = poop.body as Phaser.Physics.Arcade.Body
    poop.setVelocity(body.velocity.x * 1.2, body.velocity.y * -0.3)
  }

  private makeTextures() {
    const g = this.make.graphics({ x: 0, y: 0 })

    // Poop (Brown circle)
    g.clear()
    g.fillStyle(0x8b5a2b, 1)
    g.fillCircle(10, 10, 8) // r=8
    g.generateTexture('poop', 20, 20)

    // Bird (White circle + eye)
    g.clear()
    g.fillStyle(0xffffff, 1)
    g.fillCircle(22, 22, 22)
    g.fillStyle(0x000000, 1)
    g.fillCircle(30, 16, 4) // Eye
    g.generateTexture('bird', 44, 44)

    // Human (Dark Gray Body + Black Head)
    // Legacy: w=40, h=80. Head: x+10, y-20 (relative to body). 20x20.
    // Total texture size: 40x100 (body 80 + head 20 stick out top? no, y-20 means above body top)
    // Legacy body at y (H-120), head at y-20.
    // So distinct shapes.
    g.clear()
    // Head
    g.fillStyle(0x000000, 1)
    g.fillRect(10, 0, 20, 20)
    // Body
    g.fillStyle(0x333333, 1)
    g.fillRect(0, 20, 40, 80)

    g.generateTexture('human', 40, 100)

    g.destroy()
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-root',
  backgroundColor: '#87ceeb',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 }, // Adapted for Phaser
      debug: false,
    },
  },
  scene: [MainScene],
})
