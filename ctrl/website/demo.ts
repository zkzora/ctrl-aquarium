// Shared UI facade: testnet by default, isolated credit sandbox via ?mode=sandbox.
import {useGame} from './game-client';
import type {Change} from '../lib/world';
export const useDemo=useGame;
export type Demo=ReturnType<typeof useGame>;
export type Snapshot=Change;
export type View='home'|'room'|'history'|'guide'|'docs';
export const asset=(path:string)=>`./assets/${path}`;
export const suggestions=['Add a clownfish','Explode the orange fish','Open the treasure','Add a treasure chest','Turn gravity upside down','Make it nighttime','Add a friendly shark','Explode the shark','Throw an underwater disco','Create a black hole'];
