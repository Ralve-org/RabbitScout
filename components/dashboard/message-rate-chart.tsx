"use client"

import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import { format } from 'date-fns'
import { useState, useEffect } from 'react'

interface MessageRateChartProps {
  data: {
    timestamp: number
    publishRate: number
    deliveryRate: number
  }[]
}

export const MessageRateChart = ({ data }: MessageRateChartProps) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeDomain = {
    start: currentTime - 60 * 1000,
    end: currentTime,
  };

  const ticks = Array.from({ length: 7 }, (_, i) => timeDomain.start + (i * 10000));

  return (
    <div className="h-full bg-card rounded-lg">
      <div className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={[timeDomain.start, timeDomain.end]}
              ticks={ticks}
              tickFormatter={(timestamp) => format(new Date(timestamp), 'HH:mm:ss')}
              scale="time"
              className="text-muted-foreground"
              stroke="currentColor"
              fontSize={11}
              dy={10}
            />
            <YAxis
              tickFormatter={(value) => `${value}/s`}
              className="text-muted-foreground"
              stroke="currentColor"
              fontSize={11}
              width={40}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-1">
                        <div className="text-[0.70rem] text-muted-foreground">
                          {new Date(payload[0].payload.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[0.70rem] text-muted-foreground">Publish</span>
                            <span className="font-medium text-yellow-500">{payload[0].value}/s</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[0.70rem] text-muted-foreground">Deliver</span>
                            <span className="font-medium text-green-500">{payload[1].value}/s</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend 
              align="right"
              verticalAlign="top"
              iconType="circle"
              height={24}
              wrapperStyle={{
                paddingTop: 0,
                marginTop: -24
              }}
              formatter={(value) => (
                <span className="text-foreground">{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="publishRate"
              name="Publish"
              stroke="#eab308"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={true}
              animationDuration={300}
              animationBegin={0}
            />
            <Line
              type="monotone"
              dataKey="deliveryRate"
              name="Deliver"
              stroke="#22c55e"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={true}
              animationDuration={300}
              animationBegin={0}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
