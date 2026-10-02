import React from 'react';
import heart from '../assets/icons/heart.svg';
import external from '../assets/icons/arrow-up-right.svg';
import arrow from '../assets/icons/arrow-right.svg';
import search from '../assets/icons/magnifying-glass.svg';
import record from '../assets/icons/vinyl-record.svg';
import spotify from '../assets/icons/spotify-logo.svg';
const icons = {heart, external, arrow, search, record, spotify};
export function MusicIcon({name}) { return <span className="ms-icon" aria-hidden="true" style={{maskImage:`url(${icons[name]})`,WebkitMaskImage:`url(${icons[name]})`}}/>; }
