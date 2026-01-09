// Redux Store for SyncedMusicVisualizer

const { createStore, combineReducers } = Redux;

// Action Types
const ActionTypes = {
    SET_STATUS: 'SET_STATUS',
    SET_PLAYING: 'SET_PLAYING',
    SET_TIME: 'SET_TIME',
    SET_DURATION: 'SET_DURATION',
    RESET_PLAYBACK: 'RESET_PLAYBACK',
    START_LOADING: 'START_LOADING',
    SONG_LOADED: 'SONG_LOADED',
    LOAD_ERROR: 'LOAD_ERROR'
};

// Action Creators
const Actions = {
    setStatus: (status) => ({ type: ActionTypes.SET_STATUS, payload: status }),
    setPlaying: (isPlaying) => ({ type: ActionTypes.SET_PLAYING, payload: isPlaying }),
    setTime: (time) => ({ type: ActionTypes.SET_TIME, payload: time }),
    setDuration: (duration) => ({ type: ActionTypes.SET_DURATION, payload: duration }),
    resetPlayback: () => ({ type: ActionTypes.RESET_PLAYBACK }),
    startLoading: (data) => ({ type: ActionTypes.START_LOADING, payload: data }),
    songLoaded: (data) => ({ type: ActionTypes.SONG_LOADED, payload: data }),
    loadError: (error) => ({ type: ActionTypes.LOAD_ERROR, payload: error })
};

// Playback Reducer
const playbackInitialState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    status: 'Ready'
};

function playbackReducer(state = playbackInitialState, action) {
    switch (action.type) {
        case ActionTypes.SET_STATUS:
            return { ...state, status: action.payload };
        case ActionTypes.SET_PLAYING:
            return { ...state, isPlaying: action.payload };
        case ActionTypes.SET_TIME:
            return { ...state, currentTime: action.payload };
        case ActionTypes.SET_DURATION:
            return { ...state, duration: action.payload };
        case ActionTypes.RESET_PLAYBACK:
            return { ...state, isPlaying: false, currentTime: 0, status: 'Ready' };
        default:
            return state;
    }
}

// Song Reducer
const songInitialState = {
    currentSongId: null,
    title: 'No Song Selected',
    composer: '',
    isLoading: false,
    error: null
};

function songReducer(state = songInitialState, action) {
    switch (action.type) {
        case ActionTypes.START_LOADING:
            return { ...state, isLoading: true, error: null, title: action.payload.title };
        case ActionTypes.SONG_LOADED:
            return { 
                ...state, 
                isLoading: false, 
                currentSongId: action.payload.id, 
                title: action.payload.title, 
                composer: action.payload.composer 
            };
        case ActionTypes.LOAD_ERROR:
            return { ...state, isLoading: false, error: action.payload, title: 'Error Loading Song' };
        default:
            return state;
    }
}

// Create Store
const rootReducer = combineReducers({
    playback: playbackReducer,
    song: songReducer
});

const MusicStore = createStore(rootReducer);
