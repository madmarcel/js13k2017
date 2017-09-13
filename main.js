'use strict';

let dist = 0.0;
let sucking = false;
let blockblood = false;
let bitingher = false;

AFRAME.registerComponent('toggle-jump', {
    schema: {default: ''},
    init() {          
        this.el.addEventListener('click', () => {
            // custom event
            let event = new Event('action');
            // Dispatch the event.
            document.dispatchEvent(event);
        });
    }
});

AFRAME.registerComponent('toggle-switch', {
    schema: {default: ''},
    init() {          
        this.el.addEventListener('click', () => {
            // custom event
            let event = new Event('switch');
            // Dispatch the event.
            document.dispatchEvent(event);
        });
    }
});

AFRAME.registerComponent('toggle-start-switch', {
    schema: {default: ''},
    init() {          
        this.el.addEventListener('click', () => {
            // custom event
            let event = new Event('startswitch');
            // Dispatch the event.
            document.dispatchEvent(event);
        });
    }
});

/**
 * Crawling Cursor component for A-Frame.
 */
AFRAME.registerComponent('crawling-cursor', {
    dependencies: ['raycaster'],
    schema: {
        target: {
            type: "selector"
        }
    },

    multiple: false,

    init: function() {
        var el = this.el;
        var data = this.data;

        if (data.target === null) {
            var cursor = document.querySelector("a-cursor");

            if (cursor === null) {
                console.warn("Please put a-cursor in a document");
                return;
            }

            data.target = cursor;
        }

        el.addEventListener("raycaster-intersection", (e) => {

            var intersection = getNearestIntersection(e.detail.intersections);
            if (!intersection) {return;}

            // a matrix which represents item's movement, rotation and scale on global world
            var mat = intersection.object.matrixWorld;
            // remove parallel movement from the matrix
            mat.setPosition(new THREE.Vector3(0, 0, 0));

            // change local normal into global normal
            var global_normal = intersection.face.normal.clone().applyMatrix4(mat).normalize();

            // look at target coordinate = intersection coordinate + global normal vector
            var lookAtTarget = new THREE.Vector3().addVectors(intersection.point, global_normal);
            data.target.object3D.lookAt(lookAtTarget);

            // cursor coordinate = intersection coordinate + normal vector * 0.05(hover 5cm above intersection point)
            var cursorPosition = new THREE.Vector3().addVectors(intersection.point, global_normal.multiplyScalar(0.05));
            data.target.setAttribute("position", cursorPosition);

            function getNearestIntersection(intersections) {
                blockblood = false;
                bitingher = false;
                for (var i = 0, l = intersections.length; i < l; i++) {

                    // ignore cursor itself to avoid flicker && ignore "ignore-ray" class and ignore invisible objects
                    if (data.target === intersections[i].object.el || intersections[i].object.el.classList.contains("ignore-ray") || !intersections[i].object.el.object3D.visible)  {continue; }
                    // we can't suck blood out of these things
                    if( intersections[i].object.el.classList.contains("f") ) {
                        blockblood = true;
                    }
                    if( !blockblood && intersections[i].object.el.classList.contains("h") ) {
                        bitingher = true;
                    }
                    return intersections[i];
                }
                return null;
            }
        });
    }
});

AFRAME.registerComponent('constant-spawner', {
    schema: {
        on: {
            type: "string"
        },
        off: {
            type: "string"
        }
    },
    init: function() {
        this.interval = null;
        this.drops = [];
        this.colours = [ '8A0707', 'a20808', '720606', 'd30b0b' ];
    },
    update: function () {
        let el = this.el;
        let spawn = this.spawn.bind(this);
        if (this.on === this.data.on) { return; }
        el.addEventListener(this.data.on, function() {
            this.interval = setInterval(spawn, 300);
        });

        el.addEventListener(this.data.off, function () {
            clearInterval(this.interval);
        });    
        this.on = this.data.on;
    },
    tick: function() {
        let now = new Date().getTime();
        for(let i = 0; i < this.drops.length; i++) {
            let d = this.drops[i];
            if(d.v) {
                if( now - d.ts >= 1000 * 5) {
                    d.e.object3D.visible = false;
                    d.v = false;
                } else {
                    if(d.r < d.rmax) {
                        d.r += 0.01;
                        d.e.setAttribute('radius', d.r);
                    }
                }
            } 
        }
        // purge
        let el = this.el;
        let filtered = this.drops.filter(function(d) {
            if(!d.v) {
                el.sceneEl.removeChild(d.e);
            } 
            return d.v;
        });
        this.drops = filtered;
    },
    
    // spawn blood drops
    spawn: function () {
        if(!sucking || blockblood) {
            return;
        }
        var el = this.el;
        var matrixWorld = el.object3D.matrixWorld;
        var position = new THREE.Vector3();
        position.setFromMatrixPosition(matrixWorld);
        let rr = 0.1;
        var entity = document.createElement('a-sphere');
        entity.setAttribute('position', position);
        entity.setAttribute('radius', rr);
        entity.setAttribute('material', { color: '#' + this.colours[Math.floor(Math.random() * 4)], flatShading: true, shader: 'flat' });
        entity.className = 'ignore-ray';
        el.sceneEl.appendChild(entity);
        this.drops.push({ 'e': entity, 'r': rr, 'ts': new Date().getTime(), 'v': true, 'rmax': Math.random() * 0.5 + 0.3 });
        if(bitingher) {
            document.dispatchEvent(new Event('endgame'));
        }
    }
});

AFRAME.registerComponent('canvas-text', {
    schema: {
        text: {type: 'string', default: ''},
        width: {type: 'number', default: 256},
        height: {type: 'number', default: 64}
    },
    init: function() {
        this.update();
    },
    update: function (oldData) {
        var _ = this;
        if (!oldData) this.createCanvas(this.data.width, this.data.height);
        var fontSize = 512;
        var textSize = {};
        _.ctx.font = fontSize + "px sans-serif";
        _.ctx.fillStyle = "white";
        _.ctx.textBaseline="hanging"; 
        while (true) {
            textSize = _.ctx.measureText(this.data.text);
            if(textSize.width < this.data.width) {
                break;
            }
            fontSize -= 2;
            _.ctx.font = fontSize + "px sans-serif";
        }
        var textDiff = this.data.width - textSize.width;
        _.ctx.clearRect(0, 0, _.canvas.width, _.canvas.height);
        _.ctx.fillText(this.data.text, textDiff/2, 10);
        this.el.setAttribute("src", _.canvas.toDataURL())
        this.el.setAttribute("width", _.canvas.width/100.0)
        this.el.setAttribute("height", _.canvas.height/100.0)
    },
    createCanvas: function (w, h) {
        var _ = this;
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        _.canvas = canvas;
        _.ctx = canvas.getContext('2d');
    }
});

window.addEventListener('load', () => {

    let jumping = false;
    let isJumping = false;
    let target = document.querySelector('#my-cursor');
    let target3D = target.object3D;
    target3D.visible = false;
    let jumpIndex = 0;
    let jumpPoints = 0;

    let myswitch = false;
    let started = false;

    // grab the scene
    let sceneEl = document.querySelector('a-scene');
    // grab camera
    let camera = document.querySelector('a-camera');
    let cam = camera.object3D;

    let ctext = [
        'Q29uZ3JhdHMsIHlvdSBoYXZlIGZvdW5k',
        'dGhlIE5TRlcgc3dpdGNoIQ==',
        'R2lhbnQgKC4pKC4pIGZvciB5b3Uu'
    ];
    let ctext2 = 'SGV5LCB0aGVyZSdzIGEgTlNGVyBzd2l0Y2ggaGlkZGVuIHNvbWV3aGVyZQ==';

    for(let z = 0; z < 3; z++) {
        let t2 = document.createElement('a-image');
        t2.setAttribute('canvas-text', { 'text': atob(ctext[z]), 'width': 8192, 'height': 512 });
        t2.setAttribute('position', { 'x': -1335.559, 'y': 62.632 - (z * 10) , 'z': -1087.454 } );
        t2.className = 'ignore-ray';
        sceneEl.appendChild(t2);
    }

    let nsc = document.createElement('a-circle');
    nsc.setAttribute('position', { x: -1335.286, y: 18.399, z: -1087.274 } );
    nsc.setAttribute('radius', 5);
    nsc.setAttribute('material', { 'flatShading': true, 'shader': 'flat', 'color': '#F00' });
    nsc.className = 'switch';
    nsc.setAttribute('toggle-switch', '');
    sceneEl.appendChild(nsc);

    let t3 = document.createElement('a-image');
    t3.setAttribute('canvas-text', { 'text': 'OFF', 'width': 512, 'height': 256 });
    t3.setAttribute('position', { x: -1334.945, y: 18.45, z: -1086.616 } );
    t3.className = 'ignore-ray';
    sceneEl.appendChild(t3);

    let ch = document.querySelector('#hint');
    ch.setAttribute('canvas-text', { 'text': atob(ctext2), 'width': 8192, 'height': 512 });

    // we have a group of elements that look yuck from far away, so collect them and hide/show depending on distance
    let lod_item_names = [ 'right-eye', 'left-eye', 'lip', 'lip-2', 'screen', 'cear3', 'cear1', 'breast-left', 'breast-right', 'mlip', 'mlip-2', 'mright-eye', 'mleft-eye'];

    let lod_items = [];
    lod_item_names.forEach( (n) => {
        let i = document.querySelector('#' + n);
        if(i) {
            let i3 = i.object3D;
            i3.visible = false;
            i3.myname = n;
            i3.ignore = false;

            // don't want the relative position
            let worldPos = new THREE.Vector3();
            i3.mypos = worldPos.setFromMatrixPosition(i3.matrixWorld);

            lod_items.push(i3);
        }
    });

    let distCalc3 = (p1, p2) => {
        return Math.sqrt( Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2) );
    }

    let checkLODGroup = (p, threshold) => {
        lod_items.forEach( (lit) => {
            if(lit.ignore) {
                lit.visible = true;
                return;
            }
            let dist = distCalc3(lit.mypos, p.position);
            if(dist < threshold) {
                lit.visible = true;
            } else {
                lit.visible = false;
            }
        });
    }

    let tick = () => {
        update();
        requestAnimationFrame(tick);
    };

    let distCalc = (p1, p2) => {
        return Math.sqrt( Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2) );
    }

    let getMidPoint = (a, b) => {
        if((a + b) > 0.0 || (a + b) < 0.0) {
            return (a + b) / 2.0;
        }
        return 0.0;
    }

    let update = () => {
        if(!started) return;
        // a bit wasteful but eh...it'll do
        checkLODGroup(cam, 600);

        // work out where to jump
        dist = distCalc3(cam.position, target3D.position);
        if(dist < 15.0) {
            // we suck ze blood
            target.setAttribute('color', '#F00' );
            target.setAttribute('radius', 1 );
            target3D.visible = true;
            sucking = true;
        }
        if(dist >= 15.0 && dist < 50.0) {
            target.setAttribute('color', '#FFA500' );
            target.setAttribute('radius', 1 + ((dist - 15.0) / 4.0) );
            target3D.visible = true;
            sucking = false;
            jumping = false;
        } 
        if(dist >= 50.0 ) {
            // we are jumping
            //target3D.visible = true;
            target.setAttribute('color', '#FF0' );
            target.setAttribute('radius', 10 );
            sucking = false;
            target3D.visible = true;
        }
        if(sucking && !jumping) {
            //console.log('suck!');
        }
        if(!sucking && jumping && !isJumping) {
            if(target3D) {
                target3D.visible = true;

                let cx = cam.position.x;
                let cy = cam.position.y;
                let cz = cam.position.z;

                let tx = target3D.position.x;
                let ty = target3D.position.y;
                let tz = target3D.position.z;

                let numPoints = 40;
                
                let mx = getMidPoint(cx, tx);
                let my = getMidPoint(cy, ty);
                let mz = getMidPoint(cz, tz);

                // simple curve
                let curve = new THREE.CatmullRomCurve3( [
                    new THREE.Vector3( cx, cy, cz ),
                    new THREE.Vector3( mx, my + 50 + (dist/2.5), mz ),
                    new THREE.Vector3( tx, ty + 5.6, tz )
                ] );
                
                jumpPoints = curve.getPoints( numPoints );
                jumpIndex = 0;
                isJumping = true;
            }
            jumping = false;
        }

        // where's jumping, so update position
        if(isJumping) {
            target3D.visible = false;
            let j = jumpPoints[jumpIndex];
            cam.position.set( j.x, j.y, j.z );
            jumpIndex++;
            if(jumpIndex >= jumpPoints.length - 1) {
                isJumping = false;
                jumpIndex = 0;
            }
        }
        

    }

    let updateStuff = () => {
        // show
        let s = [ 'n'];
        // hide
        let h = [ 'clothes' ];
        // change colour
        let c = [ { 'n': 'lower', 'u': 'dd9f74', 's': 'd8905f'},
                  { 'n': 'hips-right', 'u': 'dd9f74', 's': 'd8905f'},
                  { 'n': 'hips-left', 'u': 'dd9f74', 's': 'd8905f'}
        ];
        let f = [ 'breast-left', 'breast-right' ];

        h.forEach( (n) => {
            let i = document.querySelector('#' + n);
            if(i) {
                let i3 = i.object3D;
                i3.visible = !myswitch;
            }
        });
        s.forEach( (n) => {
            let i = document.querySelector('#' + n);
            if(i) {
                let i3 = i.object3D;
                i3.visible = myswitch;
            }
        });
        c.forEach( (n) => {
            let i = document.querySelector('#' + n.n);
            if(i) {
                if(myswitch) {
                    i.setAttribute('color', '#' + n.u);
                } else {
                    i.setAttribute('color', '#' + n.s);
                }
            }
        });
        lod_items.forEach( (lit) => {
            lit.ignore = false;
            if(f.includes(lit.myname)) {
                lit.ignore = myswitch;
            }
        });
    };

    tick();

    /*document.onkeydown = (e) => {
        switch (e.keyCode) {
            case 32:
                if(!jumping && !isJumping) {
                    jumping = true;
                }
            break;
        }
    };*/

    // listen for our custom jump event
    document.addEventListener('action', (e) => {
        if(!jumping && !isJumping && !sucking) {
            jumping = true;
        }
    });

    // listen for our custom switch event
    document.addEventListener('switch', (e) => {
        myswitch = !myswitch;
        if(myswitch) {
            nsc.setAttribute('color', '#0F0');
            t3.setAttribute('canvas-text', { 'text': 'on', 'width': 512, 'height': 256 });
            updateStuff();
        } else {
            nsc.setAttribute('color', '#F00');
            t3.setAttribute('canvas-text', { 'text': 'OFF', 'width': 512, 'height': 256 });
            updateStuff();
        }
    });

    let startbox = document.querySelector('#start');
    // listen for our custom switch event
    document.addEventListener('startswitch', (e) => {
        // hide the start box
        started = true;
        startbox.setAttribute("position",  { x: 200, y: -900, z: 200 } );
        target3D.visible = true;
    });

    let endtext = document.querySelector('#se');

    document.addEventListener('endgame', (e) => {
        // back in the start box
        started = false;
        startbox.setAttribute("position",  { x: 200, y: -26, z: 200 } );
        target3D.visible = false;
        cam.position.set( 200, -26, 200 );

        // hide all the other text
        let starttexts = document.getElementsByClassName("st");
        for(let p = 0; p < starttexts.length; p++) {
            starttexts[p].object3D.visible = false;
        }
        // show end text
        endtext.object3D.visible = true;
    });

    // randomize the cat location
    let clocs = [
        { pos: { x: -2017.3, y: 1322.2, z: 1234.5 } , rot: { x: 0,  y: 110,  z: 0 }, pillow: false },
        { pos: { x: 1349.275, y: -655.962, z: -42.649 } , rot: { x: 0,  y: 14,  z: 0 }, pillow: true },
        { pos: { x: 2462.870, y: -674.156, z: -2150.927 } , rot: { x: 0,  y: -45,  z: 0 }, pillow: false },
    ];

    let pos = Math.floor(Math.random() * clocs.length);
    let kat = document.querySelector('#cat');
    kat.setAttribute("position", clocs[pos].pos );
    kat.setAttribute("rotation", clocs[pos].rot );
    if(!clocs[pos].pillow) {
        let pill = document.querySelector('#catpillow');
        pill.object3D.visible = false;
    }
});