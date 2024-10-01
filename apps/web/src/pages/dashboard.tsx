import Nav from "../components/Nav.tsx";
import { useSocket } from "../components/useSocket.ts";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { cn } from "../lib/utils.ts";
import { Ellipsis, XIcon } from "../components/icons.tsx";

type Recipient = {
  firstName: string;
  lastName: string;
  email: string;
  userId: string;
  status: "online" | "offline" | string;
};

type Message = {
  id: string;
  from: string;
  body: string;
  time: Date | string;
  recipient: string;
};

const getUserList = async (token: string) => {
  const res = await fetch("http://localhost:8080/api/users", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return await res.json();
};

const getLocalMessages = () => {
  try {
    if (window && window.localStorage) {
      const messages = localStorage.getItem("messages");
      return JSON.parse(messages || "[]");
    }
  } catch (e) {
    console.log(e);
    return [];
  }
};

export default function Dashboard() {
  const { getToken, isLoaded, userId } = useAuth();

  const [messages, setMessages] = useState<Message[]>(getLocalMessages());
  const [recipientList, setRecipientList] = useState<Recipient[]>([]);
  const [activeRecipient, setActiveRecipient] = useState<Recipient | null>(
    null,
  );
  const [currentMessage, setCurrentMessage] = useState<string>("");

  const onMessage = (event: string, value: any) => {
    if (event === "message") {
      setMessages((prevState) => [...prevState, value]);
    }
  };

  const onUserJoinOrLeave = (value: string, state: "join" | "leave") => {
    if (value === userId) return;
    const recipient = recipientList.find((rec) => rec.userId === value);
    if (recipient) {
      recipient.status = state === "join" ? "online" : "offline";
      setRecipientList([...recipientList]);
    }
  };

  const socket = useSocket(onMessage)?.connect();

  socket?.on("usersChanged", onUserJoinOrLeave);

  useEffect(() => {
    if (recipientList && recipientList.length > 0) return;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const list = await getUserList(token);
      if (!list) return;
      setRecipientList(list);
    })();
  }, []);

  useEffect(() => {
    if (window && window.localStorage) {
      window.localStorage.setItem("messages", JSON.stringify(messages));
    }
  }, [messages]);

  const endOfMessagesRef = useRef<null | HTMLDivElement>(null);

  const scrollToEnd = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

  const sendMessage = () => {
    if (!activeRecipient) return;
    const time = new Date();
    const message = {
      id: `message-${time.getTime()}`,
      from: userId as string,
      body: currentMessage,
      time: time.toISOString(),
      recipient: activeRecipient.userId,
    };

    socket?.emit("message", {
      user: activeRecipient.userId,
      content: message,
    });
    setMessages((prevState) => [...prevState, message]);
    setCurrentMessage("");
  };

  return (
    <div className={"w-full h-full items-center justify-center text-white"}>
      <Nav />
      <div className={"w-full flex flex-col items-center justify-center pt-12"}>
        <div
          className={
            "bg-zinc-900 w-full rounded-md max-w-2xl flex shadow shadow-purple-900"
          }
        >
          <div className={"h-full rounded-l-md min-w-[180px]"}>
            <div className={"p-4 font-semibold border-b border-zinc-700"}>
              Users
            </div>
            <div
              className={
                "min-h-[500px] flex flex-col min-w-0 text-xs gap-3 items-center p-2"
              }
            >
              {recipientList
                ?.filter((user) => user.userId !== userId)
                ?.map((user) => {
                  return (
                    <div
                      key={user.userId}
                      onClick={() => {
                        setActiveRecipient(user);
                      }}
                      className={
                        "w-full border border-zinc-700 rounded-md p-2 shadow relative hover:bg-zinc-600 cursor-pointer"
                      }
                    >
                      <p className={"pl-2"}>
                        {user.firstName} {user.lastName}
                      </p>
                      <span
                        className={cn(
                          "rounded-full h-2 w-2 absolute left-1 top-1/3 ",
                          user.status === "online"
                            ? "bg-green-500"
                            : "bg-red-500",
                        )}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
          <div className={"h-full  rounded-r-md w-full flex-grow "}>
            <div
              className={
                "p-4 font-semibold border-b border-l border-zinc-700 flex justify-between"
              }
            >
              <span>
                Chat{" "}
                {activeRecipient
                  ? `with ${activeRecipient.firstName} ${activeRecipient.lastName}`
                  : null}
              </span>
              <span
                className={"hover:text-red-400 cursor-pointer"}
                onClick={() => {
                  setActiveRecipient(null);
                }}
              >
                <XIcon />{" "}
              </span>
            </div>
            <div
              className={
                "min-h-[500px] flex flex-col justify-between border-l border-zinc-700 bg-zinc-800 rounded-md "
              }
            >
              <div
                className={"flex flex-col gap-2 h-[500px] overflow-auto p-2"}
              >
                {activeRecipient &&
                  messages
                    ?.filter(
                      (message) =>
                        message.from === activeRecipient?.userId ||
                        (message.from === userId &&
                          message.recipient === activeRecipient?.userId),
                    )
                    ?.map?.((message) => {
                      return (
                        <div
                          className={cn(
                            "flex w-full",
                            message.from === userId
                              ? "justify-end"
                              : "justify-start",
                          )}
                          key={message.id}
                        >
                          <div
                            className={cn(
                              "min-w-0 py-1.5 px-4 flex max-w-xs rounded-xl",
                              message.from === userId
                                ? "bg-gradient-to-br from-purple-800 to-red-700"
                                : "bg-green-500",
                            )}
                          >
                            {message.body}
                          </div>
                        </div>
                      );
                    })}
                <div ref={endOfMessagesRef}></div>
              </div>
              <form
                className={"flex justify-between gap-2 p-2 bg-zinc-900"}
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <input
                  disabled={!activeRecipient}
                  className={
                    "ring-0 border-0 ring-offset-purple-950 outline-0 focus:ring-2 bg-zinc-950 text-white block w-full rounded-md border-purple-950  py-1.5 shadow-sm ring-purple-950 placeholder:text-gray-200  focus:ring-purple-700 sm:text-sm px-4"
                  }
                  value={currentMessage}
                  onChange={(e) => {
                    setCurrentMessage(e.target.value);
                  }}
                />
                <button
                  className={
                    "bg-purple-800 text-white p-2 px-6 rounded-md shadow hover:bg-blue-500"
                  }
                  type={"submit"}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
