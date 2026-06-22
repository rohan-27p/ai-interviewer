import { useEffect, useState } from 'react';

export function useResendCooldown(seconds = 60) {
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = window.setInterval(() => {
            setCooldown((current) => (current > 0 ? current - 1 : 0));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [cooldown]);

    const startCooldown = () => setCooldown(seconds);

    return { cooldown, startCooldown, isCoolingDown: cooldown > 0 };
}
