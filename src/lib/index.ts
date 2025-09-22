import { AtpAgent } from '@atproto/api';

const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });

export async function getProfile(handle: string) {
  try {
    const response = await agent.getProfile({ actor: handle });
    if (response.success) {
      return { profile: response.data, error: null };
    } else {
      console.error(response);
      return { profile: null, error: JSON.stringify(response.data) };
    }
  } catch (err) {
    console.error(err);
    return { profile: null, error: String(err) };
  }
}

export async function getFollows(handle: string, limit: number, cursor?: string) {
  try {
    const response = await agent.getFollows({ actor: handle, limit, cursor });
    if (response.success) {
      return { follows: response.data, error: null };
    } else {
      console.error(response);
      return { follows: null, error: JSON.stringify(response.data) };
    }
  } catch (err) {
    console.error(err);
    return { follows: null, error: String(err) };
  }
}
