// WebRTC Dashboard Flow Validation Script
// Run this in browser console to validate initialization order

export class FlowValidator {
    constructor() {
        this.checks = [];
        this.errors = [];
        this.warnings = [];
    }
    
    async validate(dashboard) {
        console.log('🔍 Starting Flow Validation...\n');
        
        // Phase 1: Check Component Existence
        this.checkPhase1(dashboard);
        
        // Phase 2: Check Initialization Order
        this.checkPhase2(dashboard);
        
        // Phase 3: Check Event Handlers
        this.checkPhase3(dashboard);
        
        // Phase 4: Check WebRTC Infrastructure
        this.checkPhase4(dashboard);
        
        // Print Results
        this.printResults();
        
        return {
            passed: this.errors.length === 0,
            checks: this.checks.length,
            errors: this.errors,
            warnings: this.warnings
        };
    }
    
    checkPhase1(dashboard) {
        console.log('📋 Phase 1: Component Existence\n');
        
        // Core Services
        this.check('DashboardManager exists', !!dashboard);
        this.check('RoomService exists', !!dashboard?.roomService);
        this.check('AccessControlManager exists', !!dashboard?.accessControl);
        this.check('ChatManager exists', !!dashboard?.chatManager);
        this.check('UIComponents exists', !!dashboard?.ui);
        
        // Managers
        this.check('RoomManager exists', !!dashboard?.roomManager);
        this.check('ParticipantManager exists', !!dashboard?.participantManager);
        
        // State
        this.check('currentUser initialized', dashboard?.currentUser !== undefined);
        this.check('elements map initialized', !!dashboard?.elements);
        
        console.log('');
    }
    
    checkPhase2(dashboard) {
        console.log('📋 Phase 2: Service Initialization\n');
        
        // Check services are initialized
        this.check('RoomService initialized', dashboard?.roomService?.isInitialized === true);
        this.check('AccessControl initialized', dashboard?.accessControl?.isInitialized === true);
        this.check('ChatManager initialized', dashboard?.chatManager?.isInitialized === true);
        
        // Check RoomService internals
        const rs = dashboard?.roomService;
        this.check('RoomService has signaling', !!rs?.signaling);
        this.check('RoomService has broadcastService', !!rs?.broadcastService);
        this.check('RoomService has rooms Map', rs?.rooms instanceof Map);
        this.check('RoomService has localRooms Set', rs?.localRooms instanceof Set);
        this.check('RoomService has roomConnectionManagers Map', rs?.roomConnectionManagers instanceof Map);
        
        // Check WebSocket connection
        if (rs?.signaling?.ws) {
            const wsState = rs.signaling.ws.readyState;
            this.check('WebSocket connected', wsState === WebSocket.OPEN, 
                wsState === WebSocket.CONNECTING ? 'WebSocket still connecting' : 'WebSocket not connected');
        } else {
            this.error('WebSocket not initialized');
        }
        
        console.log('');
    }
    
    checkPhase3(dashboard) {
        console.log('📋 Phase 3: Event Handlers\n');
        
        const rs = dashboard?.roomService;
        const ac = dashboard?.accessControl;
        const cm = dashboard?.chatManager;
        
        // Check RoomService handlers
        this.check('RoomService has onOffer handler', typeof rs?.signaling?.onOffer === 'function');
        this.check('RoomService has onAnswer handler', typeof rs?.signaling?.onAnswer === 'function');
        this.check('RoomService has onIceCandidate handler', typeof rs?.signaling?.onIceCandidate === 'function');
        
        // Check broadcast handlers
        this.check('RoomService listening to broadcasts', !!rs?.broadcastService);
        this.check('AccessControl listening to broadcasts', !!ac?.broadcastService);
        this.check('ChatManager listening to broadcasts', !!cm?.broadcastService);
        
        // Check dashboard event handlers
        this.check('Dashboard has event handlers', dashboard?.eventHandlers instanceof Map);
        
        console.log('');
    }
    
    checkPhase4(dashboard) {
        console.log('📋 Phase 4: WebRTC Infrastructure\n');
        
        const rs = dashboard?.roomService;
        
        // Check if any rooms exist
        const hasRooms = rs?.rooms?.size > 0;
        const hasLocalRooms = rs?.localRooms?.size > 0;
        
        if (hasLocalRooms) {
            console.log(`  Found ${rs.localRooms.size} local room(s) (you are host)`);
            
            // Check each local room has RoomConnectionManager
            for (const roomId of rs.localRooms) {
                const rcm = rs.roomConnectionManagers.get(roomId);
                this.check(`Room ${roomId.substring(0, 8)}... has RoomConnectionManager`, !!rcm);
                
                if (rcm) {
                    this.check(`  - RoomConnectionManager has signaling`, !!rcm.signaling);
                    this.check(`  - RoomConnectionManager has peers Map`, rcm.peers instanceof Map);
                    this.check(`  - RoomConnectionManager has dataChannels Map`, rcm.dataChannels instanceof Map);
                    
                    // Check connected peers
                    const connectedPeers = rcm.getConnectedPeers?.() || [];
                    console.log(`  - Connected peers: ${connectedPeers.length}`);
                    
                    if (connectedPeers.length > 0) {
                        for (const peerId of connectedPeers) {
                            const pc = rcm.peers.get(peerId);
                            const dc = rcm.dataChannels.get(peerId);
                            
                            this.check(`    Peer ${peerId.substring(0, 8)}... has PeerConnection`, !!pc);
                            this.check(`    Peer ${peerId.substring(0, 8)}... has DataChannel`, !!dc);
                            
                            if (pc) {
                                this.check(`    Peer ${peerId.substring(0, 8)}... connection state`, 
                                    pc.connectionState === 'connected',
                                    `State: ${pc.connectionState}`);
                            }
                            
                            if (dc) {
                                this.check(`    Peer ${peerId.substring(0, 8)}... channel state`, 
                                    dc.readyState === 'open',
                                    `State: ${dc.readyState}`);
                            }
                        }
                    }
                }
            }
        } else {
            console.log('  No local rooms (you are not hosting)');
        }
        
        if (hasRooms && !hasLocalRooms) {
            console.log(`  Found ${rs.rooms.size} remote room(s) (you can join)`);
        }
        
        console.log('');
    }
    
    check(description, condition, warning = null) {
        this.checks.push({ description, passed: condition });
        
        if (condition) {
            console.log(`  ✅ ${description}`);
        } else {
            console.log(`  ❌ ${description}`);
            this.errors.push(description);
        }
        
        if (warning) {
            console.log(`     ⚠️  ${warning}`);
            this.warnings.push(warning);
        }
    }
    
    error(description) {
        console.log(`  ❌ ${description}`);
        this.errors.push(description);
    }
    
    printResults() {
        console.log('═'.repeat(60));
        console.log('📊 Validation Results\n');
        console.log(`Total Checks: ${this.checks.length}`);
        console.log(`Passed: ${this.checks.filter(c => c.passed).length}`);
        console.log(`Failed: ${this.errors.length}`);
        console.log(`Warnings: ${this.warnings.length}`);
        console.log('═'.repeat(60));
        
        if (this.errors.length === 0) {
            console.log('\n✅ All checks passed! Dashboard is properly initialized.\n');
        } else {
            console.log('\n❌ Some checks failed. Review errors above.\n');
            console.log('Failed checks:');
            this.errors.forEach(err => console.log(`  - ${err}`));
            console.log('');
        }
        
        if (this.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            this.warnings.forEach(warn => console.log(`  - ${warn}`));
            console.log('');
        }
    }
}

// Usage in browser console:
// import { FlowValidator } from './validate-flow.js';
// const validator = new FlowValidator();
// await validator.validate(window.dashboard);

// Or quick check:
window.validateDashboard = async function() {
    const { FlowValidator } = await import('./validate-flow.js');
    const validator = new FlowValidator();
    return await validator.validate(window.dashboard);
};

console.log('💡 Flow validator loaded. Run: await validateDashboard()');
