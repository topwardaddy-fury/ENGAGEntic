import { NormalizedContext } from '../context/types';

export interface Adapter<T = any> {
    id: string;
    render(context: NormalizedContext): T;
}
