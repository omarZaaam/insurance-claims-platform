import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

// Kafka stub using Redis for demo purposes
@Injectable()
export class KafkaService implements OnModuleInit {
  private redis: Redis;

  async onModuleInit() {
    const broker = process.env.KAFKA_BROKER || 'localhost:6379';
    const [host, port] = broker.split(':');
    
    this.redis = new Redis({
      host,
      port: parseInt(port, 10),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    console.log('✅ Kafka stub (Redis) initialized');
  }

  async produce(topic: string, key: string, message: any) {
    const payload = JSON.stringify({
      topic,
      key,
      value: message,
      timestamp: new Date().toISOString(),
      partition: this.getPartition(key),
      offset: await this.redis.incr(`kafka:${topic}:offset`),
    });

    await this.redis.lpush(`kafka:${topic}`, payload);
    await this.redis.publish(`kafka:${topic}:notifications`, payload);

    console.log(`📨 Kafka produce → ${topic}`, { key, partition: this.getPartition(key) });
    
    return {
      topic,
      partition: this.getPartition(key),
      offset: await this.redis.get(`kafka:${topic}:offset`),
    };
  }

  async consume(topic: string, groupId: string, callback: (message: any) => Promise<void>) {
    const consumer = new Redis({
      host: this.redis.options.host,
      port: this.redis.options.port,
    });

    consumer.subscribe(`kafka:${topic}:notifications`, (err) => {
      if (err) {
        console.error('Failed to subscribe:', err);
      }
    });

    consumer.on('message', async (channel, message) => {
      try {
        const parsed = JSON.parse(message);
        await callback(parsed);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    console.log(`📥 Kafka consumer started for ${topic} (group: ${groupId})`);
  }

  private getPartition(key: string): number {
    // Simple hash-based partitioning (3 partitions)
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 3;
  }
}

// Made with Bob
