import { AtpAgent } from '@atproto/api';

const agent = new AtpAgent({ service: 'https://public.api.bsky.app' });

export async function getProfile(handle: string) {
  try {
    const response = await agent.getProfile({ actor: handle });
    if (response.success) {
      return response.data;
    } else {
      console.error(response);
      return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function getFollows(handle: string, limit: number, cursor?: string) {
  try {
    const response = await agent.getFollows({ actor: handle, limit, cursor });
    if (response.success) {
      return response.data;
    } else {
      console.error(response);
      return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}
