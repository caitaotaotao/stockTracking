import type { Strategy } from '../src/types';

const API_BASE_URL = 'http://localhost:8000'


// 获取策略列表
export const fetchStrategies = async (): Promise<Strategy[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/strategies/`);
        if (!response.ok) {
            throw new Error(`获取策略列表请求失败！${response.status}`)
        }
        const data = await response.json()
        return data.map((strategy: any) => ({
            id: String(strategy.id),
            name: strategy.name,
            description: strategy.description || '',
        }));
    } catch (error) {
        console.error('获取策略列表失败：', error);
        return [];
    }
};

